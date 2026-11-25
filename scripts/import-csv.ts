/**
 * Import players from a CSV file.
 * Columns: name,position,nation,club,league,rating,tier,is_icon,included
 * 
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/import-csv.ts path/to/players.csv
 */

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";
import * as fs from "fs";
import * as path from "path";

const VALID_POSITIONS = new Set(["GK", "DEF", "MID", "FWD"]);
const VALID_TIERS = new Set(["S", "A", "B", "C"]);

function parseBool(val: string | undefined): boolean {
  if (!val) return false;
  return ["true", "1", "yes", "y", "true"].includes(val.trim().toLowerCase());
}

function parseRating(val: string | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val.trim(), 10);
  if (isNaN(n)) return null;
  return Math.min(99, Math.max(50, n));
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-csv.ts path/to/players.csv");
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length === 0) {
    console.error("CSV file is empty");
    process.exit(1);
  }

  // Parse header
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase());
  const required = ["name", "position", "nation", "rating"];
  for (const r of required) {
    if (!headers.includes(r)) {
      console.error(`Missing required column: ${r}`);
      process.exit(1);
    }
  }

  const idx = (name: string) => headers.indexOf(name);

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(",").map((f) => f.trim().replace(/^"|"$/, ""));
    if (fields.length < headers.length) {
      skipped++;
      errors.push(`Line ${i + 1}: too few fields`);
      continue;
    }

    const name = fields[idx("name")];
    const position = fields[idx("position")]?.toUpperCase();
    const nation = fields[idx("nation")];
    const club = fields[idx("club")] || null;
    const league = fields[idx("league")] || null;
    const rating = parseRating(fields[idx("rating")]);
    const tier = fields[idx("tier")]?.toUpperCase() || null;
    const isIcon = parseBool(fields[idx("is_icon")]);
    const included = parseBool(fields[idx("included")]) !== false;

    // Validate
    if (!name) {
      skipped++;
      errors.push(`Line ${i + 1}: missing name`);
      continue;
    }
    if (!position || !VALID_POSITIONS.has(position)) {
      skipped++;
      errors.push(`Line ${i + 1}: invalid position "${position}"`);
      continue;
    }
    if (!nation) {
      skipped++;
      errors.push(`Line ${i + 1}: missing nation`);
      continue;
    }
    if (rating === null) {
      skipped++;
      errors.push(`Line ${i + 1}: invalid rating`);
      continue;
    }
    if (tier && !VALID_TIERS.has(tier)) {
      skipped++;
      errors.push(`Line ${i + 1}: invalid tier "${tier}"`);
      continue;
    }

    try {
      await db
        .insert(players)
        .values({
          externalId: `csv:${name}|${position}|${nation}|${club || ""}`,
          source: "csv",
          name,
          position: position as "GK" | "DEF" | "MID" | "FWD",
          detailedPosition: null,
          nation,
          nationEmoji: "🏳️",
          club,
          league,
          isIcon,
          rating,
          ratingOverride: null,
          tier: tier as any,
          included,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: players.externalId,
          set: {
            name,
            position: position as "GK" | "DEF" | "MID" | "FWD",
            nation,
            nationEmoji: "🏳️",
            club,
            league,
            rating: rating !== null ? rating : players.rating,
            tier: tier as any,
            included,
            updatedAt: new Date(),
          },
        });
      inserted++;
    } catch (e) {
      skipped++;
      errors.push(`Line ${i + 1}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  await db.insert(importLog).values({
    source: "csv",
    status: "completed",
    playersUpserted: inserted,
    startedAt: new Date(),
    completedAt: new Date(),
  });

  console.log(`\nCSV Import: ${inserted} inserted, ${skipped} skipped`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.slice(0, 20).forEach((e) => console.log(`  ${e}`));
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Import failed:", e);
  process.exit(1);
});
