"use server";

import { db } from "@/lib/db";
import {
  rooms,
  roomMembers,
  sets,
  setPlayers,
  picks,
  lineups,
  lineupSlots,
  votes,
  players,
} from "@/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

export interface RoomHydration {
  room: any;
  members: any[];
  sets: any[];
  setPlayers: any[];
  picks: any[];
  lineups: any[];
  lineupSlots: any[];
  votes: any[];
  players: any[];
}

export async function getRoomHydration(code: string): Promise<RoomHydration | null> {
  const room = await db.query.rooms.findFirst({ where: eq(rooms.code, code) });
  if (!room) return null;

  const members = await db.query.roomMembers.findMany({
    where: eq(roomMembers.roomId, room.id),
    orderBy: (members, { asc }) => [asc(members.seat)],
  });

  const roomSets = await db.query.sets.findMany({
    where: eq(sets.roomId, room.id),
    orderBy: (sets, { asc }) => [asc(sets.index)],
  });

  const dbSetPlayers = await db.query.setPlayers.findMany({
    where: inArray(setPlayers.setId, roomSets.map((s) => s.id)),
  });

  const dbPicks = await db.query.picks.findMany({
    where: eq(picks.roomId, room.id),
    orderBy: (picks, { asc }) => [asc(picks.round), asc(picks.id)],
  });

  const dbLineups = await db.query.lineups.findMany({
    where: eq(lineups.roomId, room.id),
  });

  const dbLineupSlots = await db.query.lineupSlots.findMany({});

  const dbVotes = await db.query.votes.findMany({
    where: eq(votes.roomId, room.id),
  });

  const allPlayers = await db.query.players.findMany({
    where: eq(players.included, true),
  });

  return {
    room,
    members,
    sets: roomSets,
    setPlayers: dbSetPlayers,
    picks: dbPicks,
    lineups: dbLineups,
    lineupSlots: dbLineupSlots,
    votes: dbVotes,
    players: allPlayers,
  };
}

export interface SetReadyInput { memberId: string; ready: boolean }
export async function setMemberReady(input: SetReadyInput) {
  await db
    .update(roomMembers)
    .set({ ready: input.ready })
    .where(eq(roomMembers.id, input.memberId));
}

export interface PickPlayerInput { memberId: string; playerId: string; round: number }
export async function pickPlayer(input: PickPlayerInput) {
  const member = await db.query.roomMembers.findFirst({
    where: eq(roomMembers.id, input.memberId),
  });
  if (!member) throw new Error("Member not found");

  // Find the set this member holds in this round
  const roomMembersList = await db.query.roomMembers.findMany({
    where: eq(roomMembers.roomId, member.roomId),
  });
  const nManagers = roomMembersList.length;
  const holdSetIndex = (member.seat + input.round) % nManagers;

  const holdSet = await db.query.sets.findFirst({
    where: and(eq(sets.roomId, member.roomId), eq(sets.index, holdSetIndex)),
  });
  if (!holdSet) throw new Error("Set not found");

  const setPlayer = await db.query.setPlayers.findFirst({
    where: and(
      eq(setPlayers.setId, holdSet.id),
      eq(setPlayers.playerId, input.playerId),
      isNull(setPlayers.takenByMemberId),
    ),
  });
  if (!setPlayer) throw new Error("Player not available in this set");

  const player = await db.query.players.findFirst({
    where: eq(players.id, input.playerId),
  });

  await db
    .update(setPlayers)
    .set({ takenByMemberId: input.memberId, takenRound: input.round })
    .where(eq(setPlayers.id, setPlayer.id));

  await db.insert(picks).values({
    roomId: member.roomId,
    memberId: input.memberId,
    playerId: input.playerId,
    round: input.round,
    slot: player?.position ?? null,
  });
}

export interface StartDraftInput { roomId: string }
export async function startDraft(input: StartDraftInput) {
  await db.update(rooms).set({ status: "drafting" }).where(eq(rooms.id, input.roomId));
}

export interface StartLineupInput { roomId: string }
export async function startLineup(input: StartLineupInput) {
  await db.update(rooms).set({ status: "lineup" }).where(eq(rooms.id, input.roomId));
}

export interface LockLineupInput { memberId: string; formationId: string }
export async function lockLineup(input: LockLineupInput) {
  const member = await db.query.roomMembers.findFirst({
    where: eq(roomMembers.id, input.memberId),
  });
  if (!member) throw new Error("Member not found");

  const lineup = await db.query.lineups.findFirst({
    where: eq(lineups.memberId, input.memberId),
  });
  if (!lineup) throw new Error("Lineup not found");

  await db
    .update(lineups)
    .set({ formationId: input.formationId, locked: true, lockedAt: new Date() })
    .where(eq(lineups.id, lineup.id));

  const all = await db.query.lineups.findMany({ where: eq(lineups.roomId, member.roomId) });
  if (all.every((l) => l.locked)) {
    await db.update(rooms).set({ status: "voting" }).where(eq(rooms.id, member.roomId));
  }
}

export interface SetLineupSlotsInput { lineupId: string; slots: { slotIndex: number; playerId: string }[] }
export async function setLineupSlots(input: SetLineupSlotsInput) {
  // Replace all slots
  await db.delete(lineupSlots).where(eq(lineupSlots.lineupId, input.lineupId));
  if (input.slots.length > 0) {
    await db.insert(lineupSlots).values(
      input.slots.map((s) => ({
        lineupId: input.lineupId,
        slotIndex: s.slotIndex,
        playerId: s.playerId,
      })),
    );
  }
}

export interface CastVoteInput { voterMemberId: string; teamMemberId: string }
export async function castVote(input: CastVoteInput) {
  const voter = await db.query.roomMembers.findFirst({
    where: eq(roomMembers.id, input.voterMemberId),
  });
  if (!voter) throw new Error("Voter not found");

  await db.insert(votes).values({
    roomId: voter.roomId,
    voterMemberId: input.voterMemberId,
    teamMemberId: input.teamMemberId,
  });
}

export interface UpdateMemberConnectedInput { memberId: string; connected: boolean }
export async function updateMemberConnected(input: UpdateMemberConnectedInput) {
  await db
    .update(roomMembers)
    .set({ connected: input.connected })
    .where(eq(roomMembers.id, input.memberId));
}
