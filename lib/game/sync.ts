/**
 * Convert DB rows (Supabase) into an EngineState.
 * Used to resync client engine state after realtime DB changes.
 */

import { type EngineState, type Member, type RoomConfig } from "@/lib/game/engine";
import type { Player } from "@/lib/game";

export interface DbRoom {
  id: string;
  code: string;
  status: string;
  mode: string;
  config: any;
  host_id: string;
  created_at: string;
}

export interface DbMember {
  id: string;
  room_id: string;
  user_id: string | null;
  display_name: string;
  is_bot: boolean;
  bot_difficulty: string | null;
  seat: number;
  ready: boolean;
  connected: boolean;
}

export interface DbSet {
  id: string;
  room_id: string;
  index: number;
}

export interface DbSetPlayer {
  id: string;
  set_id: string;
  player_id: string;
  taken_by_member_id: string | null;
  taken_round: number | null;
}

export interface DbPick {
  id: string;
  room_id: string;
  member_id: string;
  player_id: string;
  round: number;
  slot: string | null;
}

export interface DbLineup {
  id: string;
  room_id: string;
  member_id: string;
  formation_id: string;
  locked: boolean;
  locked_at: string | null;
  updated_at: string;
}

export interface DbLineupSlot {
  id: string;
  lineup_id: string;
  slot_index: number;
  player_id: string;
}

export interface DbVote {
  id: string;
  room_id: string;
  voter_member_id: string;
  team_member_id: string;
}

export interface DbPlayer {
  id: string;
  external_id: string;
  source: string;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  detailed_position: string | null;
  nation: string;
  nation_emoji: string | null;
  club: string | null;
  league: string | null;
  is_icon: boolean;
  rating: number;
  rating_override: number | null;
  tier: string | null;
  included: boolean;
  updated_at: string;
}

export function dbPlayerToPlayer(p: DbPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    rating: p.rating,
    nation: p.nation,
    nationEmoji: p.nation_emoji ?? "🏳️",
    club: p.club ?? undefined,
    isIcon: p.is_icon,
  };
}

export function dbRowsToEngineState({
  room,
  members,
  sets,
  setPlayers,
  picks,
  lineups,
  lineupSlots,
  votes,
  playersMap,
}: {
  room: DbRoom;
  members: DbMember[];
  sets: DbSet[];
  setPlayers: DbSetPlayer[];
  picks: DbPick[];
  lineups: DbLineup[];
  lineupSlots: DbLineupSlot[];
  votes: DbVote[];
  playersMap: Map<string, Player>;
}): EngineState {
  const nManagers = members.length;

  const engineMembers: Member[] = members.map((m) => ({
    seat: m.seat,
    id: m.id,
    userId: m.user_id,
    displayName: m.display_name,
    isBot: m.is_bot,
    botDifficulty: (m.bot_difficulty ?? "normal") as
      | "easy"
      | "normal"
      | "hard",
    ready: m.ready,
    connected: m.connected,
  }));

  // Sets with remaining (untaken) players
  const playersInSets = new Map<string, DbSetPlayer[]>();
  for (const sp of setPlayers) {
    const arr = playersInSets.get(sp.set_id) ?? [];
    arr.push(sp);
    playersInSets.set(sp.set_id, arr);
  }

  const setsState: { index: number; players: Player[] }[] = [];
  for (const s of sets.sort((a, b) => a.index - b.index)) {
    const available = (playersInSets.get(s.id) ?? [])
      .filter((sp) => sp.taken_by_member_id === null)
      .map((sp) => playersMap.get(sp.player_id)!)
      .filter(Boolean);
    setsState.push({ index: s.index, players: [...available] });
  }

  // Drafted per member
  const drafted: Record<string, { player: Player; round: number }[]> = {};
  for (const m of members) drafted[m.id] = [];
  for (const p of picks) {
    const pl = playersMap.get(p.player_id);
    if (!pl) continue;
    drafted[p.member_id] = drafted[p.member_id] ?? [];
    drafted[p.member_id].push({ player: pl, round: p.round });
  }

  // Picks this round (max round)
  const picksThisRound: Record<string, string> = {};
  const pickedThisRoundAvatars: Record<string, boolean> = {};
  const maxRound = picks.length ? Math.max(...picks.map((p) => p.round)) : 0;
  for (const p of picks) {
    if (p.round === maxRound) {
      picksThisRound[p.member_id] = p.player_id;
      pickedThisRoundAvatars[p.member_id] = true;
    }
  }

  // Lineups per member
  const lineupsByMember: Record<string, any> = {};
  const lineupSlotsByLineup = new Map<string, DbLineupSlot[]>();
  for (const ls of lineupSlots) {
    const arr = lineupSlotsByLineup.get(ls.lineup_id) ?? [];
    arr.push(ls);
    lineupSlotsByLineup.set(ls.lineup_id, arr);
  }
  for (const m of members) {
    const lineup = lineups.find((l) => l.member_id === m.id);
    const lineupId = lineup?.id;
    const slots = lineupId ? (lineupSlotsByLineup.get(lineupId) ?? []) : [];
    lineupsByMember[m.id] = {
      formationId: lineup?.formation_id ?? null,
      locked: lineup?.locked ?? false,
      lockedAt: lineup?.locked_at ? new Date(lineup.locked_at).getTime() : null,
      slots: slots.map((ls) => ({
        slotIndex: ls.slot_index,
        playerId: ls.player_id,
      })),
    };
  }

  // Votes
  const votesMap: Record<string, string> = {};
  for (const v of votes) {
    votesMap[v.voter_member_id] = v.team_member_id;
  }

  // Config
  const config: RoomConfig = {
    mode: (room.mode as any) ?? "current",
    buffer: (room.config?.buffer ?? 2) as number,
    positionMix: (room.config?.positionMix ?? { GK: 2, DEF: 4, MID: 4, FWD: 3 }) as any,
    pickTimer: (room.config?.pickTimer ?? 60) as number | null,
    lineupTimer: (room.config?.lineupTimer ?? 60) as number | null,
    botsVote: room.config?.botsVote ?? false,
    nationFilter: room.config?.nationFilter ?? [],
    leagueFilter: room.config?.leagueFilter ?? [],
  };

  const hostMember = members.find((m) => m.id === room.host_id) ?? members[0];

  let phase: EngineState["phase"] = "lobby";
  if (room.status === "drafting") phase = "drafting";
  if (room.status === "lineup") phase = "lineup";
  if (room.status === "voting") phase = "voting";
  if (room.status === "finished") phase = "finished";

  let round = 0;
  if (phase === "drafting") round = maxRound;
  if (phase === "lineup") round = 11;
  if (phase === "voting" || phase === "finished") round = 11;

  return {
    phase,
    round,
    nManagers,
    members: engineMembers,
    sets: setsState,
    dealtSets: setsState.map((s) => ({ index: s.index, players: [...s.players] })),
    drafted,
    picksThisRound,
    pickedThisRoundAvatars,
    lineups: lineupsByMember,
    lineupComputations: {},
    votes: votesMap,
    teamRatings: {},
    voteResults: null,
    config,
    hostMemberId: hostMember.id,
    timerSecondsLeft: null,
    statusMessage: phase === "lobby" ? "Waiting in lobby" : "In progress",
  };
}
