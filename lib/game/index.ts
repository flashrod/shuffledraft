/**
 * Pure game logic for Shuffle Draft.
 * Framework-free: accepts plain data, returns plain data.
 * No side effects, no DB, no framework imports (except config constants).
 */

import {
  BOT_NOISE,
  BOT_TARGET,
  CHEMISTRY,
  CROSS_LINE_PCT,
  GAME,
  LINE_INDEX,
  LINE_PENALTY,
  RATING,
} from "../config";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  position: Position;
  rating: number; // base draft rating 50-99
  nation: string;
  club?: string;
  nationEmoji?: string;
  isIcon?: boolean;
}

export interface SetState {
  index: number;
  players: Player[]; // players still available in this set
}

export interface DraftedPlayer {
  player: Player;
  round: number; // 0-indexed round in which it was picked
}

export interface ManagerDraft {
  seat: number;
  players: DraftedPlayer[]; // the 11 drafted players
}

export interface BotDifficulty {
  name: "easy" | "normal" | "hard";
  noise: number;
}

export interface LineupSlot {
  role: string;
  line: Position;
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  slots: LineupSlot[];
}

export interface LineupAssignment {
  formationId: string;
  formationName: string;
  slots: Array<{
    slotIndex: number;
    player: Player;
    effectiveRating: number;
    penalty: number;
  }>;
  teamRating: number;
  chemistry: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const LINE_BY_POSITION: Record<Position, Position> = {
  GK: "GK",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};

function lineDistance(natural: Position, slotLine: Position): number {
  return Math.abs(LINE_INDEX[natural] - LINE_INDEX[slotLine]);
}

/**
 * Effective rating of a player in a given slot line.
 * natural line = full rating; one line away -7; two lines away -14;
 * GK in outfield or outfielder in goal = 35% of rating.
 */
export function effectiveRating(
  player: Player,
  slotLine: Position,
): { rating: number; penalty: number; crossLine: boolean } {
  const natural = player.position as Position;
  const dist = lineDistance(natural, slotLine);
  let rating = player.rating;
  let penalty = 0;
  let crossLine = false;

  if ((natural === "GK") !== (slotLine === "GK")) {
    // cross line: GK <-> outfield
    rating = Math.round(player.rating * CROSS_LINE_PCT);
    penalty = player.rating - rating;
    crossLine = true;
  } else if (dist === 1) {
    penalty = LINE_PENALTY[1 as 1];
    rating = player.rating - penalty;
  } else if (dist === 2) {
    penalty = LINE_PENALTY[2 as 2];
    rating = player.rating - penalty;
  }

  return { rating: Math.max(1, rating), penalty, crossLine };
}

/**
 * Chemistry bonus: +0.5 per extra player sharing a nation, capped at +3.
 * Optionally same club (Current mode), capped at +3.
 */
export function chemistry(
  players: Player[],
  opts: { clubChemistry?: boolean } = {},
): number {
  const nationCounts = new Map<string, number>();
  for (const p of players) {
    nationCounts.set(p.nation, (nationCounts.get(p.nation) || 0) + 1);
  }
  let bonus = 0;
  for (const count of nationCounts.values()) {
    if (count > 1) bonus += CHEMISTRY.PER_NATION * (count - 1);
  }
  bonus = Math.min(bonus, CHEMISTRY.CAP);

  if (opts.clubChemistry) {
    const clubCounts = new Map<string, number>();
    for (const p of players) {
      if (p.club) clubCounts.set(p.club, (clubCounts.get(p.club) || 0) + 1);
    }
    let clubBonus = 0;
    for (const count of clubCounts.values()) {
      if (count > 1) clubBonus += CHEMISTRY.PER_NATION * (count - 1);
    }
    bonus += Math.min(clubBonus, CHEMISTRY.CAP);
  }

  return Math.round(bonus * 10) / 10;
}

/**
 * Provisional team rating used during the draft:
 * average base rating + chemistry (no positional penalties).
 */
export function provisionalRating(players: Player[]): number {
  if (players.length === 0) return 0;
  const avg =
    players.reduce((sum, p) => sum + p.rating, 0) / players.length;
  return Math.round((avg + chemistry(players)) * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Dealing                                                            */
/* ------------------------------------------------------------------ */

/**
 * Deal a pool into N sets at random within position groups.
 * For each position: take `required * nSets` players at random, then deal
 * exactly `required` of that position to each set — but which specific
 * players (and their ratings) land in which set is random.
 * No snake-dealing, no rating sorting, no star balancing across sets.
 */
export function dealSets(
  pool: Player[],
  nSets: number,
  positionMix: { GK: number; DEF: number; MID: number; FWD: number },
  rng: () => number = Math.random,
): SetState[] {
  const totalNeeded =
    positionMix.GK + positionMix.DEF + positionMix.MID + positionMix.FWD;
  if (totalNeeded !== GAME.SET_SIZE) {
    throw new Error(
      `Position mix sums to ${totalNeeded}, expected ${GAME.SET_SIZE}`,
    );
  }

  const sets: SetState[] = Array.from({ length: nSets }, (_, i) => ({
    index: i,
    players: [],
  }));

  const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
  const required = {
    GK: positionMix.GK,
    DEF: positionMix.DEF,
    MID: positionMix.MID,
    FWD: positionMix.FWD,
  };

  for (const pos of positions) {
    const candidates = pool.filter((p) => p.position === pos);
    const needed = required[pos] * nSets; // each set needs `required` of this position
    if (candidates.length < needed) {
      throw new Error(
        `Not enough ${pos} players in pool (${candidates.length} < ${needed})`,
      );
    }

    // Shuffle and take `needed` players at random (no rating sort).
    const taken = [...candidates].sort(() => rng() - 0.5).slice(0, needed);

    // Deal exactly `required` of this position to each set, in random order.
    // Chunk the shuffled `taken` array into nSets groups of `required`.
    for (let s = 0; s < nSets; s++) {
      const group = taken.slice(s * required[pos], (s + 1) * required[pos]);
      for (const player of group) {
        sets[s].players.push(player);
      }
    }
  }

  return sets;
}

/**
 * Which set index a manager holds in a given round (0-indexed rounds).
 * In round r, manager i holds set (i + r) mod N.
 */
export function setIndexForRound(managerSeat: number, round: number, n: number): number {
  return ((managerSeat + round) % n + n) % n;
}

/* ------------------------------------------------------------------ */
/* Draft pick validation / auto-pick                                  */
/* ------------------------------------------------------------------ */

/**
 * The slot a picked player would fill during the draft (natural position group).
 * During the draft picks are grouped by position, not formation slots.
 */
export function draftSlotForPlayer(player: Player): Position {
  return player.position;
}

/**
 * Score a candidate for a bot during the draft.
 * Bots draft toward a balanced target (1 GK, 4 DEF, 3-4 MID, 2-3 FWD).
 * Noise added by difficulty. Avoid filling a position beyond its target max.
 */
export function botDraftScore(
  player: Player,
  currentCounts: Record<Position, number>,
  difficulty: "easy" | "normal" | "hard",
  rng: () => number = Math.random,
): number {
  const pos = player.position;
  const max = {
    GK: BOT_TARGET.GK,
    DEF: BOT_TARGET.DEF_MAX,
    MID: BOT_TARGET.MID_MAX,
    FWD: BOT_TARGET.FWD_MAX,
  } as Record<Position, number>;

  // Already at max for this position -> heavily discourage (avoid wasting GK).
  if (currentCounts[pos] >= max[pos]) {
    return -1000 + rng() * 5;
  }

  let noise = 0;
  if (difficulty === "easy") noise = rng() * BOT_NOISE.easy;
  else if (difficulty === "normal") noise = rng() * BOT_NOISE.normal;
  // hard: no noise

  return player.rating + noise;
}

/**
 * Bot picks the best player from a set during the draft.
 */
export function botDraftPick(
  setPlayers: Player[],
  currentCounts: Record<Position, number>,
  difficulty: "easy" | "normal" | "hard",
  rng: () => number = Math.random,
): Player {
  let best: Player | null = null;
  let bestScore = -Infinity;
  for (const p of setPlayers) {
    const score = botDraftScore(p, currentCounts, difficulty, rng);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (!best) throw new Error("No players in set to pick");
  return best;
}

/* ------------------------------------------------------------------ */
/* Lineup: auto-arrange (optimal placement)                           */
/* ------------------------------------------------------------------ */

/**
 * Compute the best possible placement of 11 drafted players into a formation
 * maximizing total effective rating. Uses DP over bitmask (2^11 states)
 * for an exact optimum.
 */
export function autoArrange(
  players: Player[],
  formation: Formation,
): LineupAssignment {
  if (players.length !== 11) {
    throw new Error(`Expected 11 players, got ${players.length}`);
  }
  if (formation.slots.length !== 11) {
    throw new Error(`Formation ${formation.id} has ${formation.slots.length} slots`);
  }

  const n = 11;
  // eff[i][j] = effective rating of player i in slot j
  const eff: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const pen: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const { rating, penalty } = effectiveRating(players[i], formation.slots[j].line);
      eff[i][j] = rating;
      pen[i][j] = penalty;
    }
  }

  // DP over bitmask: dp[mask] = best total assigning players in `mask`
  // to the first popcount(mask) slots.
  const size = 1 << n;
  const dp = new Int32Array(size).fill(-1);
  const choice = new Int32Array(size).fill(-1); // player assigned to last filled slot
  dp[0] = 0;
  for (let mask = 0; mask < size; mask++) {
    if (dp[mask] < 0) continue;
    const slotIndex = bitCount(mask); // next slot to fill
    if (slotIndex >= n) continue;
    for (let p = 0; p < n; p++) {
      if (mask & (1 << p)) continue;
      const next = mask | (1 << p);
      const val = dp[mask] + eff[p][slotIndex];
      if (val > dp[next]) {
        dp[next] = val;
        choice[next] = p;
      }
    }
  }

  const full = size - 1;
  const totalRating = dp[full];
  // Reconstruct assignment: slot j -> player
  const slotPlayer = new Array(n).fill(-1);
  let mask = full;
  for (let j = n - 1; j >= 0; j--) {
    const p = choice[mask];
    slotPlayer[j] = p;
    mask ^= 1 << p;
  }

  const slots = slotPlayer.map((p, slotIndex) => {
    const player = players[p];
    const { rating, penalty, crossLine } = effectiveRating(player, formation.slots[slotIndex].line);
    return { slotIndex, player, effectiveRating: rating, penalty, crossLine };
  });

  const chem = chemistry(players);
  const teamRating = Math.round(((totalRating / n) + chem) * 10) / 10;

  return {
    formationId: formation.id,
    formationName: formation.name,
    slots,
    teamRating,
    chemistry: chem,
  };
}

/**
 * Brute-force reference for autoArrange (tests only).
 * Since effective rating depends only on slot *line* (not the specific slot),
 * we brute-force the assignment of players to lines respecting each line's
 * capacity, then sum effective ratings. Far smaller than 11!.
 */
export function bruteForceArrange(
  players: Player[],
  formation: Formation,
): { teamRating: number; totalEffective: number } {
  if (players.length !== 11) throw new Error("Expected 11 players");

  // Count slots per line.
  const lineCapacity: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const s of formation.slots) lineCapacity[s.line]++;

  const lines: Position[] = ["GK", "DEF", "MID", "FWD"];
  const n = players.length;
  let bestTotal = -Infinity;

  // Recursively assign each player to a line, respecting remaining capacity.
  function assign(idx: number, remaining: Record<Position, number>, total: number) {
    if (idx === n) {
      if (total > bestTotal) bestTotal = total;
      return;
    }
    const p = players[idx];
    for (const line of lines) {
      if (remaining[line] <= 0) continue;
      remaining[line]--;
      assign(idx + 1, remaining, total + effectiveRating(p, line).rating);
      remaining[line]++;
    }
  }

  assign(0, { ...lineCapacity }, 0);

  const chem = chemistry(players);
  return {
    teamRating: Math.round(((bestTotal / n) + chem) * 10) / 10,
    totalEffective: bestTotal,
  };
}

/**
 * Run auto-arrange for all formations, return top 3 sorted by team rating desc.
 */
export function suggestBestFormation(
  players: Player[],
  formations: Formation[],
): Array<LineupAssignment & { rank: number }> {
  const results = formations.map((f) => autoArrange(players, f));
  results.sort((a, b) => b.teamRating - a.teamRating);
  return results.map((r, i) => ({ ...r, rank: i + 1 })).slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Voting                                                             */
/* ------------------------------------------------------------------ */

export interface VoteResult {
  teamMemberId: string;
  votes: number;
  teamRating: number;
}

export function tallyVotes(
  votes: Array<{ voterMemberId: string; teamMemberId: string }>,
  teamRatings: Record<string, number>,
): { winner: string | null; results: VoteResult[]; ties: string[] } {
  const counts = new Map<string, number>();
  for (const v of votes) {
    counts.set(v.teamMemberId, (counts.get(v.teamMemberId) || 0) + 1);
  }

  const results: VoteResult[] = Array.from(counts.entries()).map(
    ([teamMemberId, votes]) => ({
      teamMemberId,
      votes,
      teamRating: teamRatings[teamMemberId] ?? 0,
    }),
  );

  // Sort by votes desc, then team rating desc.
  results.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return b.teamRating - a.teamRating;
  });

  const maxVotes = results.length ? results[0].votes : 0;
  const top = results.filter((r) => r.votes === maxVotes);

  let winner: string | null = null;
  if (top.length === 1) {
    winner = top[0].teamMemberId;
  } else {
    // Vote tie: break by team rating. Exact tie (same votes AND same rating) => no winner.
    const sortedTop = [...top].sort((a, b) => b.teamRating - a.teamRating);
    const runnerUp = sortedTop.slice(1).find((t) => t.teamRating === sortedTop[0].teamRating);
    winner = runnerUp ? null : sortedTop[0].teamMemberId;
  }

  const ties = top.map((r) => r.teamMemberId);

  return { winner, results, ties };
}

function bitCount(x: number): number {
  let c = 0;
  while (x) { c += x & 1; x >>= 1; }
  return c;
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate a completed lineup before lock-in.
 * - exactly 11 slots filled
 * * each slot filled with a player the manager actually drafted
 * - no duplicates
 * - valid formation id
 */
export function validateLineupLockin({
  lineup,
  draftedPlayerIds,
  formationIds,
}: {
  lineup: Array<{ slotIndex: number; playerId: string } | null>;
  draftedPlayerIds: Set<string>;
  formationIds: Set<string>;
}): { ok: boolean; error?: string } {
  const filled = lineup.filter((s) => s !== null);
  if (filled.length !== 11) {
    return { ok: false, error: "All 11 slots must be filled" };
  }

  const seen = new Set<string>();
  for (const s of filled) {
    if (!s) continue;
    if (seen.has(s.playerId)) {
      return { ok: false, error: "Duplicate player in lineup" };
    }
    seen.add(s.playerId);
    if (!draftedPlayerIds.has(s.playerId)) {
      return { ok: false, error: "Player not drafted by this manager" };
    }
  }

  // formation id validated by caller against formationIds
  return { ok: true };
}
