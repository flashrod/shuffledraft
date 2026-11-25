# Shuffle Draft

Multiplayer football draft web app inspired by Football Manager 27's Shuffle Draft mode. Friends join a lobby, draft a starting XI from a shared pool of real footballers using a rotating-set draft, then secretly vote on the best XI. No match simulation — the game is the draft plus the vote. Supports solo vs bots.

## Tech stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase Postgres + Realtime (live lobby/draft sync)
- Drizzle ORM + Zod + Vitest + Playwright
- Deploy target: Vercel

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars and configure
cp .env.example .env.local
# Edit .env.local: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ADMIN_PASSWORD

# 3. Set up the database
npm run db:push          # create schema from Drizzle
npm run db:seed          # load bundled player pool (works without APIs)

# 4. Run the dev server
npm run dev              # http://localhost:3000
```

Open two browsers to test multiplayer: create a room on one, join with the 6-char code on the other.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string (Supabase) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `API_FOOTBALL_KEY` | No | api-sports.io key (free tier: 100 req/day) |
| `ADMIN_PASSWORD` | No | Password for `/admin` (v1 protection) |

## Data import

Player data is **never hardcoded** — the app reads from the `players` table. Imports are manual/scheduled:

```bash
# Seed bundled pool (no API needed — use this to start)
npm run db:seed

# Current players from API-Football (idempotent, upsert by external_id)
API_FOOTBALL_KEY=... npm run db:import-current   # (script: scripts/import-current.ts)

# All-time icons from Wikidata SPARQL (CC0), admin-curated inclusion
npm run db:import-icons                          # (script: scripts/import-icons.ts)
```

Scripts live in `/scripts`. Each import is idempotent and logs to `import_log`.

Ratings are computed in-house (50–99):
- Current: API season average match rating mapped to the scale, or derived from per-90 goals/assists/clean-sheets normalised by position and league strength.
- Icons: admin-assigned tier (S/A/B/C → rating range).

Admins can override any rating in `/admin`; overrides survive re-imports.

## Commands

```bash
npm run dev            # dev server (Turbopack)
npm run build          # production build
npm run start          # production server
npm run test           # Vitest unit tests (game logic: dealing, rotation, ratings, bots, voting)
npm run lint           # ESLint
npx playwright test    # E2E test (solo draft → lineup → vote → results)
npm run db:generate    # Drizzle migrations
npm run db:push        # Push schema to DB
npm run db:studio      # Drizzle Studio
```

## Project structure

```
app/
  page.tsx             # Home: create / join / play vs bots
  room/[code]/page.tsx # Multiplayer room (Realtime-synced)
  admin/page.tsx       # Admin: player curation + import log
  actions/             # Server actions (rooms, room data)
components/
  game/                # Board, PlayerCard, Pitch, Draft/Lineup/Vote/Results screens, RoomContext
  ui/                  # shadcn/ui primitives
lib/
  config.ts            # All game numbers + 10 formations (single source of truth)
  game/
    index.ts           # Pure game logic: dealing, rotation, ratings, chemistry, bots, auto-arrange, voting
    engine.ts          # Client state machine: lobby → drafting → lineup → voting → finished
    sync.ts            # DB rows → EngineState resync
    game.test.ts       # 32 Vitest unit tests
  seed.ts              # Bundled player pool (fallback)
  supabase/            # Supabase client helpers
  db.ts                # Drizzle client
db/
  schema.ts            # Drizzle schema
scripts/
  import-current.ts    # API-Football importer
  import-icons.ts      # Wikidata SPARQL importer
  seed-db.ts           # DB seeder
```

## Game rules (all numbers in `lib/config.ts`)

- 2–8 managers per room, 11 rounds
- N sets of 13 players (11 XI + 2 buffer), dealt completely at random per position — no star balancing
- Round r: manager i holds set (i + r) mod N; all pick simultaneously
- Draft picks group by position (no formation yet); provisional rating = avg base + chemistry
- Lineup phase: pick 1 of 10 formations, place 11 players on a pitch, auto-arrange / suggest best formation, lock in
- Ratings: natural line = full; one line away −7; two lines away −14; GK↔outfield = 35%; chemistry +0.5 per extra same-nation player (cap +3)
- Secret vote: vote for one other XI, reveal together, winner = most votes (tie broken by team rating)
- Bots: Easy/Normal/Hard with noise; draft toward balanced target; lock best formation instantly

## Adding a mode

Modes are filters over the `players` table plus a rule config — no mode-specific code paths. The built-in modes are `current`, `icons`, and `mixed`. To add a league or nation filter, extend `config.ts` / `room.config` and filter the pool in `poolForConfig()` (engine.ts). Formation usage statistics can be imported into `formation_usage` to order the 10 formations by real-world frequency.

## Testing

- `lib/game/game.test.ts` — pure logic (dealing, rotation, slot penalties, chemistry, bots, voting, auto-arrange vs brute force)
- `e2e/draft.spec.ts` — Playwright solo flow: draft → lineup → vote → results

## License

MIT. Player names/nationalities are factual data; no photos, badges, or kits are used (licensing). Nation display uses text (or emoji fallbacks).
