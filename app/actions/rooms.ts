"use server";

import { db } from "@/lib/db";
import { rooms, roomMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GAME, ROOM_CODE_LENGTH } from "@/lib/config";
import { generateRoomCode } from "@/lib/room";
import { z } from "zod";

const roomCodeSchema = z.string().length(ROOM_CODE_LENGTH).regex(/^[A-Z0-9]+$/);

export interface CreateRoomInput {
  hostDisplayName: string;
  mode: "current" | "icons" | "mixed";
  pickTimer: number | null;
  lineupTimer: number | null;
  nManagers: number;
  botDifficulty: "easy" | "normal" | "hard";
}

export interface CreateRoomResult {
  ok: boolean;
  code?: string;
  roomId?: string;
  error?: string;
}

export async function createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
  try {
    const n = Math.min(Math.max(input.nManagers, GAME.MIN_MANAGERS), GAME.MAX_MANAGERS);

    let code: string;
    let existing: any;
    do {
      code = generateRoomCode();
      existing = await db.query.rooms.findFirst({ where: eq(rooms.code, code) });
    } while (existing);

    const [room] = await db
      .insert(rooms)
      .values({
        code,
        hostId: "host",
        status: "lobby",
        mode: input.mode,
        config: {
          buffer: GAME.BUFFER,
          positionMix: { GK: 2, DEF: 4, MID: 4, FWD: 3 },
          pickTimer: input.pickTimer,
          lineupTimer: input.lineupTimer,
          botsVote: false,
          nationFilter: [],
          leagueFilter: [],
        } as any,
      })
      .returning({ id: rooms.id });

    // Create host member (seat 0)
    const [hostMember] = await db
      .insert(roomMembers)
      .values({
        roomId: room.id,
        displayName: input.hostDisplayName,
        isBot: false,
        seat: 0,
        ready: false,
        connected: true,
      })
      .returning({ id: roomMembers.id });

    // Create bot members for remaining seats
    const botMembers = [];
    for (let seat = 1; seat < n; seat++) {
      botMembers.push({
        roomId: room.id,
        displayName: `Bot ${seat}`,
        isBot: true,
        botDifficulty: input.botDifficulty,
        seat,
        ready: true, // bots always ready
        connected: true,
      });
    }
    if (botMembers.length > 0) {
      await db.insert(roomMembers).values(botMembers);
    }

    return { ok: true, code, roomId: room.id };
  } catch (e) {
    console.error("createRoom error:", e);
    return { ok: false, error: "Failed to create room" };
  }
}

export interface JoinRoomInput {
  code: string;
  displayName: string;
}

export interface JoinRoomResult {
  ok: boolean;
  roomId?: string;
  memberId?: string;
  seat?: number;
  error?: string;
}

export async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResult> {
  try {
    const { code, displayName } = input;
    if (!roomCodeSchema.safeParse(code).success) {
      return { ok: false, error: "Invalid join code" };
    }

    const room = await db.query.rooms.findFirst({ where: eq(rooms.code, code) });
    if (!room) return { ok: false, error: "Room not found" };
    if (room.status !== "lobby") return { ok: false, error: "Draft already started" };

    const members = await db.query.roomMembers.findMany({
      where: eq(roomMembers.roomId, room.id),
    });
    if (members.length >= GAME.MAX_MANAGERS) {
      return { ok: false, error: "Room is full" };
    }

    // Find next free seat
    const takenSeats = new Set(members.map((m) => m.seat));
    let seat = 0;
    while (takenSeats.has(seat)) seat++;

    const [member] = await db
      .insert(roomMembers)
      .values({
        roomId: room.id,
        displayName,
        isBot: false,
        seat,
        ready: false,
        connected: true,
      })
      .returning({ id: roomMembers.id });

    return { ok: true, roomId: room.id, memberId: member.id, seat };
  } catch (e) {
    console.error("joinRoom error:", e);
    return { ok: false, error: "Failed to join room" };
  }
}

export interface RoomState {
  room: any;
  members: any[];
}

export async function getRoomState(roomId: string): Promise<RoomState> {
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  const members = await db.query.roomMembers.findMany({
    where: eq(roomMembers.roomId, roomId),
    orderBy: (members, { asc }) => [asc(members.seat)],
  });
  return { room, members };
}
