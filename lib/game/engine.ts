/**
 * Shuffle Draft game engine (solo-vs-bots first, multiplayer-ready).
 * Wraps the pure game logic into a single-room state machine.
 * Pure where possible; bot turns are driven by the engine.
 */

import {
  dealSets,
  setIndexForRound,
  effectiveRating,
  chemistry,
  provisionalRating,
  botDraftPick,
  autoArrange,
  suggestBestFormation,
  tallyVotes,
  validateLineupLockin,
  type Player,
  type Formation,
  type LineupAssignment,
  type Position,
  type SetState,
} from "@/lib/game";
import { GAME, FORMATIONS, POSITION_MIX } from "@/lib/config";
import { SEED_PLAYERS } from "@/lib/seed";

export type Phase = "lobby" | "drafting" | "lineup" | "voting" | "finished";

export type Member = {
  seat: number;
  id: string; // stable member id
  userId: string | null;
  displayName: string;
  isBot: boolean;
  botDifficulty: "easy" | "normal" | "hard";
  ready: boolean;
  connected: boolean;
};

export type DraftedPlayer = {
  player: Player;
  round: number; // 0-indexed
};

export interface LineupSlotFill {
  slotIndex: number;
  playerId: string;
}

export interface LineupState {
  formationId: string | null;
  locked: boolean;
  lockedAt: number | null;
  slots: LineupSlotFill[]; // length 11 when complete
}

export interface RoomConfig {
  mode: "current" | "icons" | "mixed";
  buffer: number;
  positionMix: { GK: number; DEF: number; MID: number; FWD: number };
  pickTimer: number | null; // seconds, null = off
  lineupTimer: number | null; // seconds, null = off
  botsVote: boolean;
  nationFilter: string[];
  leagueFilter: string[];
}

export interface EngineState {
  phase: Phase;
  round: number; // 0..ROUNDS-1 in drafting
  nManagers: number;
  members: Member[];
  sets: { index: number; players: Player[] }[]; // current holding sets (available)
  // snapshot of original dealt sets so we can show what was in each set
  dealtSets: { index: number; players: Player[] }[];
  drafted: Record<string, DraftedPlayer[]>; // memberId -> drafted
  picksThisRound: Record<string, string>; // memberId -> playerId picked this round
  pickedThisRoundAvatars: Record<string, boolean>; // memberId -> has picked (for UI)
  lineups: Record<string, LineupState>;
  lineupComputations: Record<string, LineupAssignment | null>; // per member current formation calc
  votes: Record<string, string>; // voterMemberId -> teamMemberId
  teamRatings: Record<string, number>; // memberId -> final team rating
  voteResults: { winner: string | null; results: any[]; ties: string[] } | null;
  config: RoomConfig;
  hostMemberId: string | null;
  timerSecondsLeft: number | null;
  statusMessage: string;
}

const DEFAULT_CONFIG: RoomConfig = {
  mode: "current",
  buffer: GAME.BUFFER,
  positionMix: POSITION_MIX.default,
  pickTimer: 60,
  lineupTimer: 60,
  botsVote: false,
  nationFilter: [],
  leagueFilter: [],
};

function newMember(
  seat: number,
  displayName: string,
  isBot = false,
  difficulty: "easy" | "normal" | "hard" = "normal",
): Member {
  return {
    seat,
    id: `member-${seat}`,
    userId: isBot ? null : `user-${seat}`,
    displayName,
    isBot,
    botDifficulty: difficulty,
    ready: isBot, // bots are always ready
    connected: true,
  };
}

/**
 * Create a fresh engine state for a solo-vs-bots room.
 */
export function createEngine(
  humanName: string,
  nManagers: number,
  botDifficulty: "easy" | "normal" | "hard" = "normal",
  config: Partial<RoomConfig> = {},
  dealtSets: SetState[] | null = null,
): EngineState {
  const n = Math.min(Math.max(nManagers, GAME.MIN_MANAGERS), GAME.MAX_MANAGERS);
  const members: Member[] = [newMember(0, humanName, false)];
  for (let s = 1; s < n; s++) {
    members.push(newMember(s, `Bot ${s}`, true, botDifficulty));
  }

  const pool = SEED_PLAYERS;
  const sets = dealtSets ?? dealSets(pool, n, config.positionMix ?? POSITION_MIX.default);

  return {
    phase: "lobby",
    round: 0,
    nManagers: n,
    members,
    sets: sets.map((s) => ({ index: s.index, players: [...s.players] })),
    dealtSets: sets,
    drafted: {},
    picksThisRound: {},
    pickedThisRoundAvatars: {},
    lineups: {},
    lineupComputations: {},
    votes: {},
    teamRatings: {},
    voteResults: null,
    config: { ...DEFAULT_CONFIG, ...config },
    hostMemberId: members[0].id,
    timerSecondsLeft: null,
    statusMessage: "Waiting in lobby",
  };
}

export type EngineAction =
  | { type: "RESET"; state: EngineState }
  | { type: "SET_NAME"; memberId: string; name: string }
  | { type: "SET_READY"; memberId: string; ready: boolean }
  | { type: "SET_MANAGERS"; n: number }
  | { type: "SET_PICK_TIMER"; seconds: number | null }
  | { type: "SET_LINEUP_TIMER"; seconds: number | null }
  | { type: "SET_CONFIG"; config: Partial<RoomConfig> }
  | { type: "START_DRAFT" }
  | { type: "PICK"; memberId: string; playerId: string }
  | { type: "BOT_TURN" }
  | { type: "ROUND_ADVANCE" }
  | { type: "LINEUP_SELECT_FORMATION"; memberId: string; formationId: string }
  | { type: "LINEUP_PLACE"; memberId: string; slotIndex: number; playerId: string | null }
  | { type: "LINEUP_CLEAR"; memberId: string; slotIndex: number }
  | { type: "LINEUP_AUTO"; memberId: string }
  | { type: "LINEUP_SUGGEST"; memberId: string }
  | { type: "LINEUP_LOCK"; memberId: string }
  | { type: "LINEUP_UNLOCK"; memberId: string }
  | { type: "VOTE"; voterMemberId: string; teamMemberId: string }
  | { type: "END_VOTING" }
  | { type: "TICK"; secondsLeft: number | null }
  | { type: "RECONNECT"; memberId: string }
  | { type: "SET_MESSAGE"; message: string };

function poolForConfig(engine: EngineState): Player[] {
  let pool = SEED_PLAYERS;
  if (engine.config.mode === "icons") pool = SEED_PLAYERS.filter((p) => p.isIcon);
  if (engine.config.mode === "current") pool = SEED_PLAYERS.filter((p) => !p.isIcon);
  return pool;
}

export function reducer(state: EngineState, action: EngineAction): EngineState {
  const s = state;
  switch (action.type) {
    case "RESET":
      return action.state;
    case "SET_NAME":
      return {
        ...s,
        members: s.members.map((m) =>
          m.id === action.memberId ? { ...m, displayName: action.name } : m,
        ),
      };
    case "SET_READY":
      return {
        ...s,
        members: s.members.map((m) =>
          m.id === action.memberId ? { ...m, ready: action.ready } : m,
        ),
      };
    case "SET_CONFIG":
      return { ...s, config: { ...s.config, ...action.config } };

    case "SET_MANAGERS": {
      const n = Math.min(Math.max(action.n, GAME.MIN_MANAGERS), GAME.MAX_MANAGERS);
      const human = s.members[0];
      const members: Member[] = [newMember(0, human.displayName, false)];
      for (let seat = 1; seat < n; seat++) {
        const existing = s.members.find((m) => m.seat === seat);
        members.push(
          existing && existing.isBot
            ? newMember(seat, existing.displayName, true, existing.botDifficulty)
            : newMember(seat, `Bot ${seat}`, true, "normal"),
        );
      }
      const pool = SEED_PLAYERS;
      const dealtSets = dealSets(pool, n, s.config.positionMix);
      return {
        ...s,
        nManagers: n,
        members,
        sets: dealtSets.map((st) => ({ index: st.index, players: [...st.players] })),
        dealtSets,
        drafted: {},
        picksThisRound: {},
        pickedThisRoundAvatars: {},
        lineups: {},
        lineupComputations: {},
        votes: {},
        teamRatings: {},
        voteResults: null,
        phase: "lobby",
        timerSecondsLeft: null,
        statusMessage: "Room updated",
      };
    }

    case "SET_PICK_TIMER":
      return { ...s, config: { ...s.config, pickTimer: action.seconds } };

    case "SET_LINEUP_TIMER":
      return { ...s, config: { ...s.config, lineupTimer: action.seconds } };

    case "START_DRAFT": {
      const n = s.nManagers;
      const pool = poolForConfig(s);
      const dealtSets = dealSets(pool, n, s.config.positionMix);
      const sets = dealtSets.map((st) => ({ index: st.index, players: [...st.players] }));
      const drafted: Record<string, DraftedPlayer[]> = {};
      for (const m of s.members) drafted[m.id] = [];
      return {
        ...s,
        phase: "drafting",
        round: 0,
        sets,
        dealtSets,
        drafted,
        picksThisRound: {},
        pickedThisRoundAvatars: {},
        lineups: {},
        lineupComputations: {},
        votes: {},
        teamRatings: {},
        voteResults: null,
        timerSecondsLeft: s.config.pickTimer ?? null,
        statusMessage: "Draft round 1",
      };
    }

    case "PICK": {
      if (s.phase !== "drafting") return s;
      const member = s.members.find((m) => m.id === action.memberId);
      if (!member) return s;
      if (s.pickedThisRoundAvatars[action.memberId]) return s; // already picked this round

      // Find the set this manager currently holds
      const holdSet = setIndexForRound(member.seat, s.round, s.nManagers);
      const setPlayers = s.sets.find((st) => st.index === holdSet)?.players ?? [];
      const player = setPlayers.find((p) => p.id === action.playerId);
      if (!player) return s; // not in current set

      // Remove from set
      const nextSets = s.sets.map((st) => {
        if (st.index !== holdSet) return st;
        return { ...st, players: st.players.filter((p) => p.id !== action.playerId) };
      });

      const drafted = { ...s.drafted, [action.memberId]: [...(s.drafted[action.memberId] ?? []), { player, round: s.round }] };
      const picksThisRound = { ...s.picksThisRound, [action.memberId]: action.playerId };
      const pickedThisRoundAvatars = { ...s.pickedThisRoundAvatars, [action.memberId]: true };

      // Provisional rating
      const allDrafted = drafted[action.memberId];
      const teamRating = provisionalRating(allDrafted.map((d) => d.player));

      let next = {
        ...s,
        sets: nextSets,
        drafted,
        picksThisRound,
        pickedThisRoundAvatars,
        teamRatings: { ...s.teamRatings, [action.memberId]: teamRating },
      };

      // If everyone picked, advance round
      const allPicked = s.members.every((m) => pickedThisRoundAvatars[m.id] === true);
      if (allPicked) {
        next = roundAdvance(next);
      }
      return next;
    }

    case "BOT_TURN": {
      if (s.phase !== "drafting") return s;
      let next = s;
      for (const m of s.members) {
        if (!m.isBot || next.pickedThisRoundAvatars[m.id]) continue;
        const holdSet = setIndexForRound(m.seat, next.round, next.nManagers);
        const setPlayers = next.sets.find((st) => st.index === holdSet)?.players ?? [];
        if (setPlayers.length === 0) continue;
        const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        for (const d of (next.drafted[m.id] ?? [])) counts[d.player.position as Position]++;
        const pick = botDraftPick(setPlayers, {
          currentCounts: counts,
          difficulty: m.botDifficulty,
          roundsRemaining: roundsRemaining(next.round),
          draftedByBot: (next.drafted[m.id] ?? []).map((d) => d.player),
        }, Math.random);
        next = reducer(next, { type: "PICK", memberId: m.id, playerId: pick.id });
      }
      return next;
    }

    case "ROUND_ADVANCE": {
      return roundAdvance(s);
    }

    case "LINEUP_SELECT_FORMATION": {
      const lineups = { ...s.lineups };
      lineups[action.memberId] = {
        ...(lineups[action.memberId] ?? { formationId: null, locked: false, lockedAt: null, slots: [] }),
        formationId: action.formationId,
        locked: false,
      };
      // recompute suggestion for this formation
      const formation = FORMATIONS.find((f) => f.id === action.formationId);
      const comp = formation && s.drafted[action.memberId]
        ? autoArrange(s.drafted[action.memberId].map((d) => d.player), formation)
        : null;
      const lineupComputations = { ...s.lineupComputations, [action.memberId]: comp };
      return { ...s, lineups, lineupComputations };
    }

    case "LINEUP_PLACE": {
      const lineups = { ...s.lineups };
      const cur = lineups[action.memberId] ?? { formationId: null, locked: false, lockedAt: null, slots: [] };
      if (cur.locked) return s;
      const slots = [...cur.slots];
      // clear any existing fill for this slot and any existing use of this player
      const playerId = action.playerId;
      const filtered = slots.filter((sl) => sl.slotIndex !== action.slotIndex && sl.playerId !== playerId);
      if (playerId != null) {
        filtered.push({ slotIndex: action.slotIndex, playerId });
      }
      filtered.sort((a, b) => a.slotIndex - b.slotIndex);
      lineups[action.memberId] = { ...cur, slots };
      // recompute if formation selected
      const formation = cur.formationId ? FORMATIONS.find((f) => f.id === cur.formationId) : null;
      const draftedPlayers = (s.drafted[action.memberId] ?? []).map((d) => d.player);
      const comp = formation && draftedPlayers.length === 11
        ? autoArrange(draftedPlayers, formation)
        : null;
      const lineupComputations = { ...s.lineupComputations, [action.memberId]: comp };
      return { ...s, lineups, lineupComputations };
    }

    case "LINEUP_CLEAR": {
      const lineups = { ...s.lineups };
      const cur = lineups[action.memberId];
      if (!cur || cur.locked) return s;
      const slots = cur.slots.filter((sl) => sl.slotIndex !== action.slotIndex);
      lineups[action.memberId] = { ...cur, slots };
      return { ...s, lineups };
    }

    case "LINEUP_AUTO": {
      const member = s.members.find((m) => m.id === action.memberId);
      if (!member) return s;
      const formation = s.lineups[action.memberId]?.formationId
        ? FORMATIONS.find((f) => f.id === s.lineups[action.memberId]!.formationId)
        : null;
      if (!formation) return s;
      const draftedPlayers = (s.drafted[action.memberId] ?? []).map((d) => d.player);
      if (draftedPlayers.length !== 11) return s;
      const comp = autoArrange(draftedPlayers, formation);
      const slots = comp.slots.map((sl) => ({ slotIndex: sl.slotIndex, playerId: sl.player.id }));
      const lineups = { ...s.lineups, [action.memberId]: { ...s.lineups[action.memberId]!, slots, locked: false } };
      const lineupComputations = { ...s.lineupComputations, [action.memberId]: comp };
      return { ...s, lineups, lineupComputations };
    }

    case "LINEUP_SUGGEST": {
      const draftedPlayers = (s.drafted[action.memberId] ?? []).map((d) => d.player);
      if (draftedPlayers.length !== 11) return s;
      const top = suggestBestFormation(draftedPlayers, FORMATIONS);
      // store top suggestion as the lineup computation keyed by member
      const lineupComputations = { ...s.lineupComputations, [action.memberId]: top[0] ?? null };
      return { ...s, lineupComputations };
    }

    case "LINEUP_LOCK": {
      const member = s.members.find((m) => m.id === action.memberId);
      if (!member) return s;
      const cur = s.lineups[action.memberId];
      if (!cur || cur.locked) return s;
      const formation = cur.formationId ? FORMATIONS.find((f) => f.id === cur.formationId) : null;
      if (!formation) return s;
      const draftedPlayerIds = new Set((s.drafted[action.memberId] ?? []).map((d) => d.player.id));
      const lineup = cur.slots.map((sl) => ({ slotIndex: sl.slotIndex, playerId: sl.playerId }));
      const validation = validateLineupLockin({ lineup, draftedPlayerIds, formationIds: new Set([formation.id]) });
      if (!validation.ok) return s; // silently reject; UI shows error
      const draftedPlayers = (s.drafted[action.memberId] ?? []).map((d) => d.player);
      const comp = autoArrange(draftedPlayers, formation);
      const lineups = { ...s.lineups, [action.memberId]: { ...cur, locked: true, lockedAt: Date.now(), slots: comp.slots.map((sl) => ({ slotIndex: sl.slotIndex, playerId: sl.player.id })) } };
      const lineupComputations = { ...s.lineupComputations, [action.memberId]: comp };
      // compute final team rating
      const teamRating = comp.teamRating;
      const teamRatings = { ...s.teamRatings, [action.memberId]: teamRating };

      // Check if all locked -> start voting
      const allLocked = s.members.every((m) => lineups[m.id]?.locked);
      let next: EngineState = { ...s, lineups, lineupComputations, teamRatings, timerSecondsLeft: null };
      if (allLocked) {
        next = startVoting(next);
      }
      return next;
    }

    case "LINEUP_UNLOCK": {
      const lineups = { ...s.lineups };
      const cur = lineups[action.memberId];
      if (!cur || !cur.locked) return s;
      lineups[action.memberId] = { ...cur, locked: false, lockedAt: null };
      return { ...s, lineups };
    }

    case "VOTE": {
      if (s.phase !== "voting") return s;
      const voter = s.members.find((m) => m.id === action.voterMemberId);
      if (!voter || voter.isBot) return s;
      if (action.voterMemberId === action.teamMemberId) return s; // can't vote self
      if (s.votes[action.voterMemberId]) return s; // already voted
      const votes = { ...s.votes, [action.voterMemberId]: action.teamMemberId };
      let next: EngineState = { ...s, votes, timerSecondsLeft: null };
      // if all humans voted (and bots vote handled), tally
      const humans = s.members.filter((m) => !m.isBot);
      const allVoted = humans.every((m) => !!votes[m.id]);
      if (allVoted) {
        next = tally(next);
      }
      return next;
    }

    case "END_VOTING": {
      if (s.phase !== "voting") return s;
      return tally(s);
    }

    case "TICK":
      return { ...s, timerSecondsLeft: action.secondsLeft };

    case "RECONNECT":
      return {
        ...s,
        members: s.members.map((m) =>
          m.id === action.memberId ? { ...m, connected: true } : m,
        ),
        statusMessage: "Reconnected",
      };

    case "SET_MESSAGE":
      return { ...s, statusMessage: action.message };
  }
  return s;
}

function roundAdvance(s: EngineState): EngineState {
  const nextRound = s.round + 1;
  const n = s.nManagers;
  if (nextRound >= GAME.ROUNDS) {
    // draft complete -> lineup phase
    const lineups: Record<string, LineupState> = {};
    const teamRatings = { ...s.teamRatings };
    for (const m of s.members) {
      lineups[m.id] = { formationId: null, locked: false, lockedAt: null, slots: [] };
      const draftedPlayers = (s.drafted[m.id] ?? []).map((d) => d.player);
      if (m.isBot && draftedPlayers.length === 11) {
        const top = suggestBestFormation(draftedPlayers, FORMATIONS);
        const best = top[0];
        if (best) {
          lineups[m.id] = {
            formationId: best.formationId,
            locked: true,
            lockedAt: Date.now(),
            slots: best.slots.map((sl) => ({ slotIndex: sl.slotIndex, playerId: sl.player.id })),
          };
          teamRatings[m.id] = best.teamRating;
        }
      }
    }
    return {
      ...s,
      phase: "lineup",
      round: nextRound,
      lineups,
      teamRatings,
      timerSecondsLeft: s.config.lineupTimer ?? null,
      statusMessage: "Lineup phase",
      picksThisRound: {},
      pickedThisRoundAvatars: {},
    };
  }

  // rotate sets: each manager now holds set (seat + nextRound) % n
  const sets = s.dealtSets.map((st) => ({ index: st.index, players: [...st.players] }));
  // but remove players already taken in previous rounds from the sets they'd be in
  // Rebuild available sets: players not yet taken at all
  const takenIds = new Set(Object.values(s.drafted).flat().map((d) => d.player.id));
  const availableSets = dealtSetsFiltered(s.dealtSets, takenIds);

  return {
    ...s,
    phase: "drafting",
    round: nextRound,
    sets: availableSets,
    picksThisRound: {},
    pickedThisRoundAvatars: {},
    timerSecondsLeft: s.config.pickTimer ?? null,
    statusMessage: `Draft round ${nextRound + 1}`,
  };
}

function dealtSetsFiltered(
  dealtSets: { index: number; players: Player[] }[],
  takenIds: Set<string>,
): { index: number; players: Player[] }[] {
  return dealtSets.map((st) => ({
    index: st.index,
    players: st.players.filter((p) => !takenIds.has(p.id)),
  }));
}

function startVoting(s: EngineState): EngineState {
  const teamRatings = { ...s.teamRatings };
  // ensure all team ratings computed
  for (const m of s.members) {
    if (!teamRatings[m.id] && s.lineups[m.id]?.locked) {
      const formation = FORMATIONS.find((f) => f.id === s.lineups[m.id]!.formationId);
      const draftedPlayers = (s.drafted[m.id] ?? []).map((d) => d.player);
      if (formation && draftedPlayers.length === 11) {
        const comp = autoArrange(draftedPlayers, formation);
        teamRatings[m.id] = comp.teamRating;
      }
    }
  }
  return {
    ...s,
    phase: "voting",
    round: GAME.ROUNDS,
    votes: {},
    teamRatings,
    voteResults: null,
    timerSecondsLeft: null,
    statusMessage: "Vote for the best XI",
  };
}

function tally(s: EngineState): EngineState {
  const votes = Object.entries(s.votes).map(([voter, team]) => ({ voterMemberId: voter, teamMemberId: team }));
  const { winner, results, ties } = tallyVotes(votes, s.teamRatings);
  return {
    ...s,
    phase: "finished",
    voteResults: { winner, results, ties },
    timerSecondsLeft: null,
    statusMessage: winner ? `Winner: ${s.members.find((m) => m.id === winner)?.displayName}` : "It's a tie!",
  };
}

/**
 * Bot turn: bots that haven't picked this round auto-pick now.
 * Call after any human pick or on round start if bots should go first.
 */
export function botTurn(state: EngineState): EngineState {
  if (state.phase !== "drafting") return state;
  let next = state;
  for (const m of state.members) {
    if (!m.isBot || next.pickedThisRoundAvatars[m.id]) continue;
    const holdSet = setIndexForRound(m.seat, next.round, next.nManagers);
    const setPlayers = next.sets.find((st) => st.index === holdSet)?.players ?? [];
    if (setPlayers.length === 0) continue;
    // current counts for this bot
    const counts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const d of (next.drafted[m.id] ?? [])) counts[d.player.position as Position]++;
    const pick = botDraftPick(setPlayers, {
      currentCounts: counts,
      difficulty: m.botDifficulty,
      roundsRemaining: roundsRemaining(next.round),
      draftedByBot: (next.drafted[m.id] ?? []).map((d) => d.player),
    }, Math.random);
    // apply PICK via reducer logic inline (reuse by dispatching)
    next = reducer(next, { type: "PICK", memberId: m.id, playerId: pick.id });
  }
  return next;
}
