/**
 * Seed the players table with the bundled seed pool so the app works before
 * API imports are configured.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-db.ts
 */

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";
import { SEED_PLAYERS } from "@/lib/seed";
import { sql } from "drizzle-orm";

async function main() {
  console.log(`Seeding ${SEED_PLAYERS.length} players...`);

  // Clear existing seed-only data (source = 'seed') to keep idempotent
  await db.delete(players).where(sql`${players.source} = 'seed'`);

  let inserted = 0;
  for (const p of SEED_PLAYERS) {
    await db.insert(players).values({
      externalId: p.id,
      source: "seed",
      name: p.name,
      position: p.position,
      detailedPosition: null,
      nation: p.nation,
      nationEmoji: p.nationEmoji,
      club: p.club || null,
      league: null,
      isIcon: p.isIcon || false,
      rating: p.rating,
      ratingOverride: null,
      tier: p.isIcon ? "A" : null,
      included: true,
      updatedAt: new Date(),
    });
    inserted++;
  }

  await db.insert(importLog).values({
    source: "seed",
    status: "completed",
    playersUpserted: inserted,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`Done. ${inserted} seed players inserted.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
