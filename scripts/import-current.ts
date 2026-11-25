/**
 * Import current players from API-Football (api-sports.io).
 * Free tier: 100 requests/day. Respect rate limits; cache raw responses;
 * upsert by external_id (idempotent).
 *
 * Usage:
 *   API_FOOTBALL_KEY=... DATABASE_URL=... npx tsx scripts/import-current.ts
 */

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;
const CACHE_DIR = "/tmp/shuffle-draft-api-cache";

// Leagues to pull squads for (free tier friendly — keep small).
const LEAGUES = [
  { id: 39, name: "Premier League", country: "England" },
  { id: 140, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 61, name: "Ligue 1", country: "France" },
  { id: 78, name: "Bundesliga", country: "Germany" },
] as const;

const SEASON = "2024";

function cachePath(key: string) {
  return `${CACHE_DIR}/${key.replace(/[^a-z0-9]/gi, "_")}.json`;
}

function readCache(key: string): any | null {
  try {
    const fs = require("fs");
    const p = cachePath(key);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(key: string, data: any) {
  try {
    const fs = require("fs");
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(key), JSON.stringify(data));
  } catch {
    // cache write failures are non-fatal
  }
}

async function fetchApi(endpoint: string, params: Record<string, string | number> = {}) {
  if (!API_KEY) {
    throw new Error("API_FOOTBALL_KEY is not set");
  }
  const cacheKey = endpoint + JSON.stringify(params);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const resp = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!resp.ok) throw new Error(`API-Football ${endpoint} failed: ${resp.status}`);
  const data = await resp.json();
  writeCache(cacheKey, data);
  return data;
}

function mapPosition(detailed: string): "GK" | "DEF" | "MID" | "FWD" {
  const d = (detailed || "").toLowerCase();
  if (d.includes("goalkeeper")) return "GK";
  if (d.includes("defender")) return "DEF";
  if (d.includes("midfielder")) return "MID";
  if (d.includes("forward")) return "FWD";
  // Fallback by common abbreviations
  if (["gk"].includes(d)) return "GK";
  if (["lb", "rb", "cb", "lwb", "rwb"].includes(d)) return "DEF";
  if (["cdm", "cm", "cam", "lm", "rm"].includes(d)) return "MID";
  if (["lw", "rw", "st", "cf"].includes(d)) return "FWD";
  return "MID";
}

/**
 * Draft rating (50-99) for current players.
 * Formula: map season average match rating onto 50-99 scale when available;
 * otherwise derive from per-90 stats (goals, assists, clean sheets) normalised
 * per position and by league strength.
 */
function computeRating(player: any, leagueName: string): number {
  const stats = player.statistics?.[0];
  if (!stats) return 60;

  const games = stats.games || {};
  const minutes = games.minutes_played || 0;
  const rating = games.rating; // season average match rating (API-Football provides this)

  // If API provides a season average match rating (typically ~5-10 scale), map to 50-99.
  if (rating && rating > 0) {
    // API-Football rating is typically 0-10, one decimal. Map: rating 6 -> ~60, 8 -> ~80, 10 -> ~99
    const mapped = 50 + (rating - 5) * 10;
    return Math.min(99, Math.max(50, Math.round(mapped)));
  }

  // Derive from per-90 stats normalised per position.
  const goals = stats.goals?.total || 0;
  const assists = stats.goals?.assists || 0;
  const shots = stats.goals?.shots || 0;
  const passes = stats.passes?.total || 0;
  const tack = stats.tackles?.total || 0;
  const cs = (games.clean_sheet || 0); // clean sheets (GK/DEF focus)

  const pos = mapPosition(player.position || "");
  const mins90 = Math.max(1, minutes / 90);

  let score = 50; // base
  if (pos === "GK") {
    score += Math.min(25, cs * 4); // clean sheets matter most
    score += Math.min(10, Math.round(passes / mins90 / 20));
  } else if (pos === "DEF") {
    score += Math.min(15, cs * 3);
    score += Math.min(15, Math.round((tack + goals + assists) / mins90 / 2));
  } else if (pos === "MID") {
    score += Math.min(20, Math.round((goals + assists) / mins90 * 4));
    score += Math.min(15, Math.round(passes / mins90 / 30));
  } else {
    // FWD
    score += Math.min(30, Math.round((goals + assists) / mins90 * 5));
    score += Math.min(15, Math.round(shots / mins90 / 2));
  }

  // League strength adjustment (rough): top-5 leagues get a small bump.
  const top5 = ["Premier League", "La Liga", "Serie A", "Ligue 1", "Bundesliga"];
  if (top5.includes(leagueName)) score += 3;

  // Minimum minutes threshold: too few minutes -> lower confidence rating.
  if (minutes < 450) score -= 5;

  return Math.min(99, Math.max(50, Math.round(score)));
}

function nationEmoji(nation: string): string {
  const map: Record<string, string> = {
    England: "🏴󠁧󠁢󠁥󠁮󠁧󠁢", Spain: "🇪🇸", France: "🇫🇷", Germany: "🇩🇪",
    Italy: "🇮🇹", Argentina: "🇦🇷", Brazil: "🇧🇷", Portugal: "🇵🇹",
    Netherlands: "🇳🇱", Belgium: "🇧🇪", Morocco: "🇲🇦", Norway: "🇳🇴",
    Poland: "🇵🇱", Croatia: "🇭🇷", Senegal: "🇸🇳", Egypt: "🇪🇬",
    Nigeria: "🇳🇬", Sweden: "🇸🇪", Uruguay: "🇺🇾", Hungary: "🇭🇺",
    Switzerland: "🇨🇭", Denmark: "🇩🇰", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  };
  return map[nation] || "🏳️";
}

async function importLeague(league: (typeof LEAGUES)[number], logId: string) {
  console.log(`Importing ${league.name} (${league.id})...`);

  // Get teams in the league
  const teamsResp = await fetchApi("/teams", { league: league.id, season: SEASON });
  const teams = teamsResp.response || [];
  console.log(`  ${teams.length} teams`);

  let upserted = 0;

  for (const team of teams) {
    const teamId = team.team.id;
    const teamName = team.team.name;

    // Get squad for the team
    const squadResp = await fetchApi("/players", { team: teamId, season: SEASON });
    const playersList = squadResp.response || [];

    for (const p of playersList) {
      const player = p.player;
      const stats = p.statistics?.[0] || {};
      const position = mapPosition(player.position);
      const nation = player.nationality || "Unknown";
      const rating = computeRating(p, league.name);

      try {
        await db
          .insert(players)
          .values({
            externalId: String(player.id),
            source: "api-football",
            name: player.name,
            position,
            detailedPosition: player.position || null,
            nation,
            nationEmoji: nationEmoji(nation),
            club: teamName,
            league: league.name,
            isIcon: false,
            rating,
            ratingOverride: null,
            tier: null,
            included: true,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: players.externalId,
            set: {
              name: player.name,
              position,
              detailedPosition: player.position || null,
              nation,
              nationEmoji: nationEmoji(nation),
              club: teamName,
              league: league.name,
              rating: sql`COALESCE(${players.ratingOverride}, EXCLUDED.rating)`, // preserve admin overrides
              updatedAt: new Date(),
            },
          });
        upserted++;
      } catch (e) {
        console.error(`  Failed upsert ${player.name}:`, e);
      }

      // Rate limit breathing room between player batches
      await new Promise((r) => setTimeout(r, 20));
    }

    // Respect free-tier rate limit between teams
    await new Promise((r) => setTimeout(r, 100));
  }

  return upserted;
}

async function main() {
  if (!API_KEY) {
    console.error("API_FOOTBALL_KEY not set. Set it and re-run to import live data.");
    process.exit(0);
  }

  let total = 0;
  for (const league of LEAGUES) {
    try {
      const n = await importLeague(league, "");
      total += n;
      console.log(`  ${league.name}: ${n} players upserted`);
    } catch (e) {
      console.error(`  ${league.name} failed:`, e);
    }
  }

  // Log import
  await db.insert(importLog).values({
    source: "api-football",
    status: "completed",
    playersUpserted: total,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`\nDone. Total players upserted: ${total}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
