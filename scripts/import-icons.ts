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
 * SPARQL query for notable human football players (soccer) with position,
 * nationality, and (optionally) a sport category. We filter to humans with
 * occupation "football player" and a position statement.
 */
const QUERY = `
SELECT ?player ?playerName ?position ?positionLabel ?nation ?nationLabel ?dob ?dod WHERE {
  ?player wdt:P31 wd:Q5;            # human
          wdt:P106 wd:Q2096446;     # occupation: football player
          wdt:P27 ?nation;          # country of citizenship
          wdt:P569 ?dob;            # date of birth
          OPTIONAL { ?player wdt:P570 ?dod }  # date of death (retired)
          OPTIONAL { ?player wdt:P413 ?position }  # position played
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?playerName
LIMIT 2000
`;

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
  };
  return map[nation] || "🏳️";
}

// Tier heuristics: assign based on name recognition isn't possible here;
// leave tier null so admins set it in /admin. Default included=false.

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
    const dod = b.dod?.value; // retired if has death date or old birth date

    // Only include clearly retired players (born before 1990 or has death date)
    const dob = b.dob?.value || "";
    const birthYear = parseInt(dob.slice(0, 4), 10);
    const isRetired = !!dod || (birthYear && birthYear < 1990);
    if (!isRetired) {
      skipped++;
      continue;
    }

    // Only keep ones we can map to a position
    if (!position) {
      skipped++;
      continue;
    }

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
        rating: 70, // placeholder; admins set tier -> rating
        ratingOverride: null,
        tier: null,
        included: false, // admins curate inclusion
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
