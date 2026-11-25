"use server";

import { db } from "@/lib/db";
import { players, importLog } from "@/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export interface AdminPlayer {
  id: string;
  externalId: string;
  source: string;
  name: string;
  position: string;
  nation: string;
  club: string | null;
  league: string | null;
  isIcon: boolean;
  rating: number;
  ratingOverride: number | null;
  tier: string | null;
  included: boolean;
}

export async function verifyAdmin(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  if (password === ADMIN_PASSWORD) {
    cookieStore.set("admin", "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
    return true;
  }
  return false;
}

export async function isAuthed(): Promise<boolean> {
  if (!ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  return cookieStore.get("admin")?.value === "1";
}

export async function signOutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin");
}

export async function listPlayers(search?: string): Promise<AdminPlayer[]> {
  const where = search
    ? or(ilike(players.name, `%${search}%`), ilike(players.club, `%${search}%`))
    : undefined;
  const rows = await db.query.players.findMany({
    where,
    orderBy: (players, { asc }) => [asc(players.name)],
    limit: 200,
  });
  return rows.map((p) => ({
    id: p.id,
    externalId: p.externalId,
    source: p.source,
    name: p.name,
    position: p.position,
    nation: p.nation,
    club: p.club,
    league: p.league,
    isIcon: p.isIcon,
    rating: p.rating,
    ratingOverride: p.ratingOverride,
    tier: p.tier,
    included: p.included,
  }));
}

export async function updatePlayer(input: {
  id: string;
  rating?: number;
  position?: "GK" | "DEF" | "MID" | "FWD";
  tier?: string;
  included?: boolean;
}) {
  await db
    .update(players)
    .set({
      ...(input.rating !== undefined ? { ratingOverride: input.rating } : {}),
      ...(input.position ? { position: input.position } : {}),
      ...(input.tier !== undefined ? { tier: input.tier } : {}),
      ...(input.included !== undefined ? { included: input.included } : {}),
      updatedAt: new Date(),
    })
    .where(eq(players.id, input.id));
}

export async function getImportLog() {
  return db.query.importLog.findMany({
    orderBy: (importLog, { desc }) => [desc(importLog.startedAt)],
    limit: 20,
  });
}
