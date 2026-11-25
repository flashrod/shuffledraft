/**
 * Import all-time icons from Wikidata via SPARQL (CC0 licensed).
 * Queries notable retired footballers with position + nationality.
 * Admins curate inclusion via the /admin panel (sets `included` + tier).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/import-icons.ts
 */

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

/**
 * SPARQL query for notable retired footballers.
 * Filters to humans with occupation "football player", position statement,
 * nationality, and date of birth. Retired = has death date OR born before 1990.
 */
const QUERY = `
SELECT ?player ?playerName ?position ?positionLabel ?nation ?nationLabel ?dob ?dod WHERE {
  ?player wdt:P31 wd:Q5;            # human
          wdt:P106 wd:Q2096446;     # occupation: football player
          wdt:P27 ?nation;          # country of citizenship
          wdt:P569 ?dob;            # date of birth
          OPTIONAL { ?player wdt:P570 ?dod }  # date of death
          OPTIONAL { ?player wdt:P413 ?position }  # position played
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?playerName
LIMIT 3000
`;

/**
 * Wikidata position labels -> our position categories.
 * Wikidata uses varied labels; we match by keyword.
 */
function mapPosition(label: string | null): "GK" | "DEF" | "MID" | "FWD" | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("goalkeeper")) return "GK";
  if (l.includes("defender")) return "DEF";
  if (l.includes("midfielder")) return "MID";
  if (l.includes("forward")) return "FWD";
  if (l.includes("goalkeeper")) return "GK";
  return null;
}

function nationEmoji(nation: string): string {
  const map: Record<string, string> = {
    England: "🏴󠁧󠁢󠁥󠁮󠁧󠁢", Spain: "🇪🇸", France: "🇫🇷", Germany: "🇩🇪",
    Italy: "🇮🇹", Argentina: "🇦🇷", Brazil: "🇧🇷", Portugal: "🇵🇹",
    Netherlands: "🇳🇱", Belgium: "🇧🇪", Morocco: "🇲🇦", Uruguay: "🇺🇾",
    Hungary: "🇭🇺", "Northern Ireland": "🇬🇧",
    "Soviet Union": "🏳️", "Czech Republic": "🇨🇿", "Ivory Coast": "🇨🇮",
    Nigeria: "🇳🇬", Ghana: "🇬🇭", Cameroon: "🇨🇲", "United States": "🇺🇸",
    Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", Poland: "🇵🇱",
    Croatia: "🇭🇷", Denmark: "🇩🇰", Sweden: "🇸🇪", Switzerland: "🇨🇭",
    "United Arab Emirates": "🇦🇪", "South Africa": "🇿🇦",
    Egypt: "🇪🇬", "Senegal": "🇸🇳", "Mali": "🇲🇱",
    "Burkina Faso": "🇧🇫", "Algeria": "🇩🇿", "Tunisia": "🇹🇳",
    "Costa Rica": "🇨🇷", Panama: "🇵🇦", Jamaica: "🇯🇲",
    "Trinidad and Tobago": "🇹🇹", "Curaçao": "🇨🇼",
  };
  return map[nation] || "🏳️";
}

/**
 * Assign an icon tier based on name recognition heuristics.
 * Wikidata doesn't have a "fame" field, so we use name matching against
 * widely-recognized legends. Admins can override tiers in /admin.
 */
function assignTier(name: string): "S" | "A" | "B" | "C" {
  const sTier = [
    "Pele", "Maradona", "Messi", "Ronaldo", "Cruyff", "Beckenbauer",
    "Maldini", "Zidane", "Ronaldinho", "Ronaldo Nazario",
    "Alfredo Di Stefano", "Ferenc Puskas", "George Best", "Johan Cruyff",
    "Franz Beckenbauer", "Paolo Maldini", "Franco Baresi", "Cafu",
    "Roberto Carlos", "Zinedine Zidane", "Pavel Nedved",
  ];
  const aTier = [
    "Lev Yashin", "Gianluigi Buffon", "Didier Drogba", "Thierry Henry",
    "Ronaldo Nazario", "Romario", "Bebeto", "Careca", "Socrates",
    "Falcao", "Tostao", "Jairzinho", "Carlos Alberto", "Mario Zagallo",
    "Nestor Combin", "Omar Sivori", "Danone", "Jimmy Greaves", "Bobby Charlton",
    "Bobby Moore", "Geoff Hurst", "Eusebio", "Michel Platini", "Raymond Kopa",
    "Just Fontaine", "Helmut Rahn", "Fritz Walter", "Ottmar Walter",
    "Max Morlock", "Horst Szymaniak", "Hans Schafer", "Alfredo Di Stefano",
    "Ferenc Puskas", "Sandor Kocsis", "Zoltan Czibor", "Gusztav Sebes",
    "Nandor Hidegkuti", "Jenő Buzánszky",
    "Gusztáv Sebes", "Mihály Lantos",
    "Gyula Grosics", "Jenő Buzanszky",
  ];
  const l = name.toLowerCase();
  if (sTier.some((n) => l.includes(n.toLowerCase()))) return "S";
  if (aTier.some((n) => l.includes(n.toLowerCase()))) return "A";
  return "B";
}

/**
 * Tier -> base draft rating (50-99).
 * Icons are all-time legends; even C-tier icons are solid draft picks.
 */
function tierToRating(tier: "S" | "A" | "B" | "C", name: string): number {
  const ranges: Record<string, [number, number]> = {
    S: [95, 99],
    A: [90, 94],
    B: [85, 89],
    C: [80, 84],
  };
  const range = ranges[tier];
  if (!range) return 70;
  const [min, max] = range;
  // Deterministic pseudo-random within tier range based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const ratio = Math.abs(hash) % 100 / 100;
  return Math.floor(min + ratio * (max - min + 1));
}

async function fetchSparql() {
  const resp = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "ShuffleDraft/1.0 (dylanmascarenhas)",
    },
    body: `query=${encodeURIComponent(QUERY)}`,
  });
  if (!resp.ok) throw new Error(`Wikidata SPARQL failed: ${resp.status}`);
  return resp.json();
}

async function main() {
  console.log("Querying Wikidata SPARQL for icons...");
  const data = await fetchSparql();
  const bindings: any[] = data.results?.bindings || [];
  console.log(`  ${bindings.length} raw bindings`);

  // Deduplicate by player (Wikidata entity id)
  const seen = new Set<string>();
  let inserted = 0;
  let skipped = 0;

  for (const b of bindings) {
    const playerUri = b.player?.value;
    if (!playerUri || seen.has(playerUri)) continue;
    seen.add(playerUri);

    const playerId = playerUri.split("/entity/")[1];
    const name = b.playerName?.value || "Unknown";
    const position = mapPosition(b.positionLabel?.value);
    const nation = b.nationLabel?.value || "Unknown";
    const dod = b.dod?.value;
    const dob = b.dob?.value || "";
    const birthYear = parseInt(dob.slice(0, 4), 10);
    const isRetired = !!dod || (birthYear && birthYear < 1990);

    if (!isRetired) {
      skipped++;
      continue;
    }
    if (!position) {
      skipped++;
      continue;
    }

    const tier = assignTier(name);
    const rating = tierToRating(tier, name);

    try {
      await db.insert(players).values({
        externalId: `wikidata:${playerId}`,
        source: "wikidata",
        name,
        position,
        detailedPosition: b.positionLabel?.value || null,
        nation,
        nationEmoji: nationEmoji(nation),
        club: null,
        league: null,
        isIcon: true,
        rating,
        ratingOverride: null,
        tier,
        included: false,
        updatedAt: new Date(),
      }).onConflictDoNothing();
      inserted++;
    } catch (e) {
      skipped++;
    }
  }

  await db.insert(importLog).values({
    source: "wikidata",
    status: "completed",
    playersUpserted: inserted,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`\nIcons: ${inserted} inserted, ${skipped} skipped (${seen.size} unique)`);
  console.log("Admins: open /admin to set tier/rating and toggle inclusion.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
