/**
 * Central game configuration.
 * All numbers that govern the draft live here.
 */

export const GAME = {
  /** Number of players each manager drafts (the XI). */
  XI_SIZE: 11,
  /** Number of drafting rounds. */
  ROUNDS: 11,
  /** Extra players per set beyond the 11 XI picks. */
  BUFFER: 2,
  /** Number of players per set = XI_SIZE + BUFFER. */
  SET_SIZE: 11 + 2,
  /** Minimum / maximum managers per room. */
  MIN_MANAGERS: 2,
  MAX_MANAGERS: 8,
} as const;

export const POSITION_MIX = {
  /** Default position mix per set. */
  default: { GK: 2, DEF: 4, MID: 4, FWD: 3 },
} as const;

/** Sum check: 2+4+4+3 = 13 = SET_SIZE */
assertPositionMix(POSITION_MIX.default);

/** Allowed formations in the lobby / lineup phase. */
export const FORMATION_OPTIONS = [
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
  "5-3-2",
] as const;

export type FormationId = (typeof FORMATION_OPTIONS)[number];

/** Pick timer options (seconds). null = off. */
export const PICK_TIMER_OPTIONS: Array<number | null> = [15, 30, 60, null];

/** Lineup timer options (seconds). null = off. */
export const LINEUP_TIMER_OPTIONS: Array<number | null> = [60, 120, 180, null];

/** Rating scale bounds. */
export const RATING = { MIN: 50, MAX: 99 } as const;

/** Position line index (for penalty calc): GK=0, DEF=1, MID=2, FWD=3 */
export const LINE_INDEX = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

/** Penalties by line distance: 0 = natural, 1 = one line away, 2 = two lines away */
export const LINE_PENALTY = { 0: 0, 1: 7, 2: 14 } as const;

/** GK in outfield or outfielder in goal = 35% of rating. */
export const CROSS_LINE_PCT = 0.35;

/** Chemistry: +0.5 per extra player sharing a nation, capped at +3. */
export const CHEMISTRY = { PER_NATION: 0.5, CAP: 3 } as const;

/** Bot noise by difficulty (added to effective rating when picking). */
export const BOT_NOISE = { easy: 8, normal: 4, hard: 0 } as const;

/** Bot target composition for drafting. */
export const BOT_TARGET = { GK: 1, DEF_MIN: 4, DEF_MAX: 4, MID_MIN: 3, MID_MAX: 4, FWD_MIN: 2, FWD_MAX: 3 } as const;

/** Room code length. */
export const ROOM_CODE_LENGTH = 6;
export const FORMATIONS: Array<{
  id: string;
  name: string;
  slots: Array<{ role: string; line: "GK" | "DEF" | "MID" | "FWD"; x: number; y: number }>;
}> = [
  {
    id: "4-3-3",
    name: "4-3-3",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "CDM", line: "MID", x: 50, y: 50 },
      { role: "CM", line: "MID", x: 80, y: 42 },
      { role: "CM", line: "MID", x: 20, y: 42 },
      { role: "LW", line: "FWD", x: 90, y: 22 },
      { role: "ST", line: "FWD", x: 50, y: 12 },
      { role: "RW", line: "FWD", x: 10, y: 22 },
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "CDM", line: "MID", x: 50, y: 56 },
      { role: "CDM", line: "MID", x: 50, y: 44 },
      { role: "CAM", line: "MID", x: 50, y: 28 },
      { role: "LW", line: "MID", x: 88, y: 22 },
      { role: "ST", line: "FWD", x: 50, y: 12 },
      { role: "RW", line: "MID", x: 12, y: 22 },
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "LM", line: "MID", x: 85, y: 46 },
      { role: "CM", line: "MID", x: 60, y: 46 },
      { role: "CM", line: "MID", x: 40, y: 46 },
      { role: "RM", line: "MID", x: 15, y: 46 },
      { role: "ST", line: "FWD", x: 65, y: 16 },
      { role: "ST", line: "FWD", x: 35, y: 16 },
    ],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "CDM", line: "MID", x: 50, y: 58 },
      { role: "LM", line: "MID", x: 86, y: 38 },
      { role: "CM", line: "MID", x: 65, y: 38 },
      { role: "CM", line: "MID", x: 35, y: 38 },
      { role: "RM", line: "MID", x: 14, y: 38 },
      { role: "ST", line: "FWD", x: 50, y: 12 },
    ],
  },
  {
    id: "4-4-1-1",
    name: "4-4-1-1",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "LM", line: "MID", x: 85, y: 46 },
      { role: "CM", line: "MID", x: 62, y: 46 },
      { role: "CM", line: "MID", x: 38, y: 46 },
      { role: "RM", line: "MID", x: 15, y: 46 },
      { role: "CAM", line: "MID", x: 50, y: 24 },
      { role: "ST", line: "FWD", x: 50, y: 12 },
    ],
  },
  {
    id: "4-1-2-1-2",
    name: "4-1-2-1-2 (diamond)",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 85, y: 68 },
      { role: "CB", line: "DEF", x: 66, y: 68 },
      { role: "CB", line: "DEF", x: 34, y: 68 },
      { role: "RB", line: "DEF", x: 15, y: 68 },
      { role: "CDM", line: "MID", x: 50, y: 58 },
      { role: "CM", line: "MID", x: 68, y: 42 },
      { role: "CM", line: "MID", x: 32, y: 42 },
      { role: "CAM", line: "MID", x: 50, y: 24 },
      { role: "ST", line: "FWD", x: 65, y: 14 },
      { role: "ST", line: "FWD", x: 35, y: 14 },
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "CB", line: "DEF", x: 66, y: 66 },
      { role: "CB", line: "DEF", x: 50, y: 66 },
      { role: "CB", line: "DEF", x: 34, y: 66 },
      { role: "WB", line: "MID", x: 90, y: 54 },
      { role: "CM", line: "MID", x: 68, y: 44 },
      { role: "CM", line: "MID", x: 32, y: 44 },
      { role: "WB", line: "MID", x: 10, y: 54 },
      { role: "LW", line: "FWD", x: 88, y: 20 },
      { role: "ST", line: "FWD", x: 50, y: 10 },
      { role: "RW", line: "FWD", x: 12, y: 20 },
    ],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "CB", line: "DEF", x: 66, y: 66 },
      { role: "CB", line: "DEF", x: 50, y: 66 },
      { role: "CB", line: "DEF", x: 34, y: 66 },
      { role: "WB", line: "MID", x: 90, y: 54 },
      { role: "CM", line: "MID", x: 70, y: 44 },
      { role: "CM", line: "MID", x: 30, y: 44 },
      { role: "WB", line: "MID", x: 10, y: 54 },
      { role: "CAM", line: "MID", x: 66, y: 22 },
      { role: "CAM", line: "MID", x: 34, y: 22 },
      { role: "ST", line: "FWD", x: 50, y: 10 },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "CB", line: "DEF", x: 66, y: 66 },
      { role: "CB", line: "DEF", x: 50, y: 66 },
      { role: "CB", line: "DEF", x: 34, y: 66 },
      { role: "WB", line: "MID", x: 90, y: 54 },
      { role: "CM", line: "MID", x: 70, y: 44 },
      { role: "CM", line: "MID", x: 50, y: 44 },
      { role: "CM", line: "MID", x: 30, y: 44 },
      { role: "WB", line: "MID", x: 10, y: 54 },
      { role: "ST", line: "FWD", x: 65, y: 16 },
      { role: "ST", line: "FWD", x: 35, y: 16 },
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    slots: [
      { role: "GK", line: "GK", x: 50, y: 92 },
      { role: "LB", line: "DEF", x: 88, y: 66 },
      { role: "CB", line: "DEF", x: 68, y: 66 },
      { role: "CB", line: "DEF", x: 50, y: 66 },
      { role: "CB", line: "DEF", x: 32, y: 66 },
      { role: "RB", line: "DEF", x: 12, y: 66 },
      { role: "LM", line: "MID", x: 85, y: 44 },
      { role: "CM", line: "MID", x: 50, y: 44 },
      { role: "RM", line: "MID", x: 15, y: 44 },
      { role: "ST", line: "FWD", x: 65, y: 16 },
      { role: "ST", line: "FWD", x: 35, y: 16 },
    ],
  },
] as const;

export type FormationSlot = (typeof FORMATIONS)[number]["slots"][number];

function assertPositionMix(mix: { GK: number; DEF: number; MID: number; FWD: number }) {
  const sum = mix.GK + mix.DEF + mix.MID + mix.FWD;
  if (sum !== GAME.SET_SIZE) {
    throw new Error(
      `Position mix sums to ${sum}, expected ${GAME.SET_SIZE} (XI_SIZE + BUFFER)`,
    );
  }
}
