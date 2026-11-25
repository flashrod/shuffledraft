/**
 * Import current players from Sofifa (sofifa.com).
 *
 * NOTE: Sofifa is protected by Cloudflare bot detection. Direct fetch and
 * headless browsers get a 403 from this environment. Run this script from a
 * machine/network that can reach sofifa.com (e.g. your local machine, or via
 * a residential proxy + stealth browser). Verify the CSS selectors below
 * against the live HTML before a full run — Sofifa's markup can change.
 *
 * The scraper pages through https://sofifa.com/players?offset=0, 60 per page,
 * parses each player row, and upserts into the `players` table idempotently by
 * externalId (`sofifa:<playerId>`).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/import-sofifa.ts [--max-pages 20] [--league "Premier League"]
 */

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";
import { sql } from "drizzle-orm";

const BASE = "https://sofifa.com";
const CACHE_DIR = "/tmp/shuffle-draft-sofifa-cache";
const PLAYERS_PER_PAGE = 60;

// CSS selectors — VERIFY these against live Sofifa HTML before a full run.
const SEL = {
  playerRow: "table.table tbody tr, table tbody tr",
  playerLink: "td.col-name a[href*='/player/']",
  overall: "td.col-ovr",
  potential: "td.col-pot",
  nationImg: "td.col-nation img, td.col-nation[title]",
  clubLink: "td.col-club a",
  leagueLink: "td.col-league a",
  nextPage: 'a[href*="offset="]:last-of-type, .pagination a:last-of-type',
} as const;

function cachePath(key: string) {
  return `${CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, "_")}.html`;
}

function readCache(key: string): string | null {
  try {
    const fs = require("fs");
    const p = cachePath(key);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function writeCache(key: string, html: string) {
  try {
    const fs = require("fs");
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), html);
  } catch {
    // non-fatal
  }
}

function parseIntSafe(s: string | null, fallback = 0): number {
  if (!s) return fallback;
  const n = parseInt(s.trim().replace(/,/g, ""), 10);
  return isNaN(n) ? fallback : n;
}

function mapPosition(posText: string | null): "GK" | "DEF" | "MID" | "FWD" {
  const p = (posText || "").toLowerCase();
  if (p.includes("gk") || p.includes("goalkeeper")) return "GK";
  if (["lb", "rb", "cb", "lwb", "rwb", "def", "defender"].some((k) => p.includes(k)))
    return "DEF";
  if (["cdm", "cm", "cam", "lm", "rm", "mid", "midfielder"].some((k) => p.includes(k)))
    return "MID";
  if (["lw", "rw", "st", "cf", "fwd", "forward", "attacker"].some((k) => p.includes(k)))
    return "FWD";
  // Sofifa often lists multiple positions like "RW, ST" — take first token.
  const first = p.split(/[,/]/)[0].trim();
  if (first.includes("gk")) return "GK";
  if (["lb", "rb", "cb", "lwb", "rwb"].includes(first)) return "DEF";
  if (["cdm", "cm", "cam", "lm", "rm"].includes(first)) return "MID";
  if (["lw", "rw", "st", "cf"].includes(first)) return "FWD";
  return "MID";
}

function nationEmoji(nation: string): string {
  const map: Record<string, string> = {
    England: "🏴󠁧󠁢󠁥󠁮󠁧󠁢", Spain: "🇪🇸", France: "🇫🇷", Germany: "🇩🇪",
    Italy: "🇮🇹", Argentina: "🇦🇷", Brazil: "🇧🇷", Portugal: "🇵🇹",
    Netherlands: "🇳🇱", Belgium: "🇧🇪", Morocco: "🇲🇦", Norway: "🇳🇴",
    Poland: "🇵🇱", Croatia: "🇭🇷", Senegal: "🇸🇳", Egypt: "🇪🇬",
    Nigeria: "🇳🇬", Sweden: "🇸🇪", Uruguay: "🇺🇾", Hungary: "🇭🇺",
    Switzerland: "🇨🇭", Denmark: "🇩🇰", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    United States: "🇺🇸", Mexico: "🇲🇽", "South Korea": "🇰🇷", Japan: "🇯🇵",
    "Saudi Arabia": "🇸🇦", Qatar: "🇶🇦", "United Arab Emirates": "🇦🇪",
    "South Africa": "🇿🇦", Algeria: "🇩🇿", Tunisia: "🇹🇳",
    "Czech Republic": "🇨🇿", "Soviet Union": "🏳️",
  };
  return map[nation] || "🏳️";
}

// Tiny DOM parser using the DOM API available via jsdom (already a devDep).
// We construct a document from HTML and query it.
let JSDOM: any = null;
async function getJSDOM() {
  if (!JSDOM) {
    const { JSDOM: J } = require("jsdom");
    JSDOM = J;
  }
  return JSDOM;
}

function $doc(html: string) {
  // Synchronous parse for use inside the page-evaluation equivalent here.
  const { JSDOM } = require("jsdom");
  return new JSDOM(html).window.document;
}

async function fetchPage(url: string): Promise<string> {
  const cacheKey = url;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!resp.ok) throw new Error(`Sofifa ${url} failed: ${resp.status}`);
  const html = await resp.text();
  writeCache(cacheKey, html);
  return html;
}

/**
 * Parse a single players listing page. Returns player records plus the next
 * page URL (or null if there is no next page).
 */
function parsePlayersPage(html: string): { players: SofifaPlayer[]; nextUrl: string | null } {
  const doc = $doc(html);
  const rows = Array.from(doc.querySelectorAll(SEL.playerRow));
  const out: SofifaPlayer[] = [];

  for (const row of rows) {
    const link = row.querySelector(SEL.playerLink) as HTMLAnchorElement | null;
    if (!link) continue; // skip header/empty rows

    const href = link.getAttribute("href") || "";
    const m = href.match(/\/player\/(\d+)\//);
    const playerId = m?.[1];
    if (!playerId) continue;

    const name = link.textContent?.trim() || "Unknown";

    // Positions cell may be in the name cell or a dedicated cell.
    const posText =
      row.querySelector(".col-name .player-position")?.textContent?.trim() ||
      link.parentElement?.textContent?.replace(name, "").trim() ||
      "";

    const overallEl = row.querySelector(SEL.overall);
    const overall = parseIntSafe(overallEl?.textContent?.trim(), null as any);
    // overall may be null if selector mismatched; handle below.
    const rating = overall != null && overall > 0 ? Math.min(99, Math.max(50, overall)) : 60;

    const nationEl = row.querySelector(SEL.nationImg);
    const nation =
      nationEl?.getAttribute("title") ||
      nationEl?.getAttribute("alt") ||
      row.querySelector(SEL.nationImg)?.textContent?.trim() ||
      "Unknown";

    const clubEl = row.querySelector(SEL.clubLink) as HTMLAnchorElement | null;
    const club = clubEl?.textContent?.trim() || null;

    const leagueEl = row.querySelector(SEL.leagueLink) as HTMLAnchorElement | null;
    const league = leagueEl?.textContent?.trim() || null;

    out.push({
      playerId,
      name,
      detailedPosition: posText || null,
      position: mapPosition(posText),
      nation,
      club,
      league,
      rating,
    });
  }

  // Find next page link
  let nextUrl: string | null = null;
  const nextEl = doc.querySelector(SEL.nextPage) as HTMLAnchorElement | null;
  if (nextEl) {
    const href = nextEl.getAttribute("href");
    if (href) nextUrl = href.startsWith("http") ? href : `${BASE}${href}`;
  }

  return { players: out, nextUrl };
}

interface SofifaPlayer {
  playerId: string;
  name: string;
  detailedPosition: string | null;
  position: "GK" | "DEF" | "MID" | "FWD";
  nation: string;
  club: string | null;
  league: string | null;
  rating: number;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      args[k] = v ?? "true";
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const maxPages = parseIntSafe(args["max-pages"], 50);
  const leagueFilter = args["league"] || null;

  let url = `${BASE}/players?offset=0`;
  let page = 0;
  let totalUpserted = 0;
  let totalSeen = 0;

  console.log(`Sofifa import starting (maxPages=${maxPages}, leagueFilter=${leagueFilter ?? "none"})...`);

  while (url && page < maxPages) {
    page++;
    console.log(`\nPage ${page}: ${url}`);

    let html: string;
    try {
      html = await fetchPage(url);
    } catch (e) {
      console.error(`  Failed to fetch page ${page}:`, e);
      break;
    }

    // Detect Cloudflare block page
    if (/Just a moment|challenge-platform|Enable JavaScript and cookies/.test(html)) {
      console.error(
        `  Blocked by Cloudflare on page ${page}. Run from an environment that can reach Sofifa.`,
      );
      break;
    }

    const { players: pagePlayers, nextUrl } = parsePlayersPage(html);
    console.log(`  ${pagePlayers.length} player rows parsed`);

    for (const p of pagePlayers) {
      totalSeen++;
      if (leagueFilter && p.league && !p.league.toLowerCase().includes(leagueFilter.toLowerCase())) {
        continue;
      }

      try {
        await db
          .insert(players)
          .values({
            externalId: `sofifa:${p.playerId}`,
            source: "sofifa",
            name: p.name,
            position: p.position,
            detailedPosition: p.detailedPosition,
            nation: p.nation,
            nationEmoji: nationEmoji(p.nation),
            club: p.club,
            league: p.league,
            isIcon: false,
            rating: p.rating,
            ratingOverride: null,
            tier: null,
            included: true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: players.externalId,
            set: {
              name: p.name,
              position: p.position,
              detailedPosition: p.detailedPosition,
              nation: p.nation,
              nationEmoji: nationEmoji(p.nation),
              club: p.club,
              league: p.league,
              rating: sql`COALESCE(${players.ratingOverride}, EXCLUDED.rating)`, // preserve admin overrides
              updatedAt: new Date(),
            },
          });
        totalUpserted++;
      } catch (e) {
        console.error(`  Failed upsert ${p.name}:`, e);
      }

      // Polite delay between player upserts (DB writes are cheap; keep minimal).
      await new Promise((r) => setTimeout(r, 5));
    }

    url = nextUrl;
    // Respectful delay between pages.
    await new Promise((r) => setTimeout(r, 500));
  }

  await db.insert(importLog).values({
    source: "sofifa",
    status: totalUpserted > 0 ? "completed" : "failed",
    playersUpserted: totalUpserted,
    error: totalUpserted === 0 ? "No players upserted (possibly Cloudflare blocked)" : null,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`\nDone. ${totalSeen} seen, ${totalUpserted} upserted across ${page} page(s).`);
  process.exit(totalUpserted > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
