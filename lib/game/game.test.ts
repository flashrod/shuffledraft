import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";
import {
  dealSets,
  setIndexForRound,
  effectiveRating,
  chemistry,
  provisionalRating,
  botDraftPick,
  botDraftScore,
  autoArrange,
  bruteForceArrange,
  suggestBestFormation,
  tallyVotes,
  validateLineupLockin,
  type Player,
  type Formation,
  type Position,
} from "./index";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: overrides.id || "p1",
    name: overrides.name || "Player",
    position: (overrides.position as Position) || "MID",
    rating: overrides.rating ?? 70,
    nation: overrides.nation || "England",
    club: overrides.club || "Club A",
    nationEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁢",
    ...overrides,
  };
}

const formation433: Formation = {
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
};

describe("effectiveRating", () => {
  it("full rating in natural line", () => {
    const p = makePlayer({ position: "DEF", rating: 80 });
    expect(effectiveRating(p, "DEF")).toEqual({ rating: 80, penalty: 0, crossLine: false });
  });
  it("one line away penalty -7", () => {
    const p = makePlayer({ position: "DEF", rating: 80 });
    expect(effectiveRating(p, "MID")).toEqual({ rating: 73, penalty: 7, crossLine: false });
  });
  it("two lines away penalty -14", () => {
    const p = makePlayer({ position: "DEF", rating: 80 });
    expect(effectiveRating(p, "FWD")).toEqual({ rating: 66, penalty: 14, crossLine: false });
  });
  it("GK in outfield = 35%", () => {
    const p = makePlayer({ position: "GK", rating: 80 });
    expect(effectiveRating(p, "DEF").rating).toBe(Math.round(80 * 0.35)); // 28
    expect(effectiveRating(p, "DEF").crossLine).toBe(true);
  });
  it("outfielder in goal = 35%", () => {
    const p = makePlayer({ position: "FWD", rating: 80 });
    expect(effectiveRating(p, "GK").rating).toBe(Math.round(80 * 0.35)); // 28
    expect(effectiveRating(p, "GK").crossLine).toBe(true);
  });
  it("rating never below 1", () => {
    const p = makePlayer({ position: "GK", rating: 50 });
    expect(effectiveRating(p, "FWD").rating).toBeGreaterThanOrEqual(1);
  });
});

describe("chemistry", () => {
  it("no bonus for all different nations", () => {
    expect(chemistry([makePlayer({ nation: "A" }), makePlayer({ nation: "B" })])).toBe(0);
  });
  it("+0.5 per extra player sharing a nation", () => {
    // 3 English = 0.5 * 2 = 1.0
    expect(
      chemistry([
        makePlayer({ nation: "England" }),
        makePlayer({ nation: "England" }),
        makePlayer({ nation: "England" }),
      ]),
    ).toBe(1);
  });
  it("capped at +3", () => {
    // 8 same nation = 0.5*7 = 3.5 -> capped at 3
    const players = Array.from({ length: 8 }, () => makePlayer({ nation: "England" }));
    expect(chemistry(players)).toBe(3);
  });
  it("club chemistry optional capped at +3", () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      makePlayer({ nation: "N" + i, club: "Club X" }),
    );
    expect(chemistry(players, { clubChemistry: true })).toBe(3);
  });
});

describe("provisionalRating", () => {
  it("average base + chemistry", () => {
    const players = [
      makePlayer({ rating: 80, nation: "England" }),
      makePlayer({ rating: 60, nation: "Spain" }),
    ];
    // avg 70 + chem 0 = 70
    expect(provisionalRating(players)).toBe(70);
  });
});

describe("dealSets", () => {
  const pool: Player[] = [
    // 6 GK (need 2 per set x 3 sets)
    makePlayer({ id: "gk1", position: "GK", rating: 90 }),
    makePlayer({ id: "gk2", position: "GK", rating: 85 }),
    makePlayer({ id: "gk3", position: "GK", rating: 80 }),
    makePlayer({ id: "gk4", position: "GK", rating: 75 }),
    makePlayer({ id: "gk5", position: "GK", rating: 70 }),
    makePlayer({ id: "gk6", position: "GK", rating: 60 }),
    // 12 DEF (need 4 per set x 3 sets)
    makePlayer({ id: "d1", position: "DEF", rating: 90 }),
    makePlayer({ id: "d2", position: "DEF", rating: 85 }),
    makePlayer({ id: "d3", position: "DEF", rating: 80 }),
    makePlayer({ id: "d4", position: "DEF", rating: 75 }),
    makePlayer({ id: "d5", position: "DEF", rating: 70 }),
    makePlayer({ id: "d6", position: "DEF", rating: 65 }),
    makePlayer({ id: "d7", position: "DEF", rating: 60 }),
    makePlayer({ id: "d8", position: "DEF", rating: 55 }),
    makePlayer({ id: "d9", position: "DEF", rating: 50 }),
    makePlayer({ id: "d10", position: "DEF", rating: 48 }),
    makePlayer({ id: "d11", position: "DEF", rating: 45 }),
    makePlayer({ id: "d12", position: "DEF", rating: 40 }),
    // 12 MID (need 4 per set x 3 sets)
    makePlayer({ id: "m1", position: "MID", rating: 90 }),
    makePlayer({ id: "m2", position: "MID", rating: 85 }),
    makePlayer({ id: "m3", position: "MID", rating: 80 }),
    makePlayer({ id: "m4", position: "MID", rating: 75 }),
    makePlayer({ id: "m5", position: "MID", rating: 70 }),
    makePlayer({ id: "m6", position: "MID", rating: 65 }),
    makePlayer({ id: "m7", position: "MID", rating: 60 }),
    makePlayer({ id: "m8", position: "MID", rating: 55 }),
    makePlayer({ id: "m9", position: "MID", rating: 50 }),
    makePlayer({ id: "m10", position: "MID", rating: 48 }),
    makePlayer({ id: "m11", position: "MID", rating: 45 }),
    makePlayer({ id: "m12", position: "MID", rating: 40 }),
    // 9 FWD (need 3 per set x 3 sets)
    makePlayer({ id: "f1", position: "FWD", rating: 90 }),
    makePlayer({ id: "f2", position: "FWD", rating: 80 }),
    makePlayer({ id: "f3", position: "FWD", rating: 70 }),
    makePlayer({ id: "f4", position: "FWD", rating: 60 }),
    makePlayer({ id: "f5", position: "FWD", rating: 50 }),
    makePlayer({ id: "f6", position: "FWD", rating: 45 }),
    makePlayer({ id: "f7", position: "FWD", rating: 40 }),
    makePlayer({ id: "f8", position: "FWD", rating: 35 }),
    makePlayer({ id: "f9", position: "FWD", rating: 30 }),
  ];

  it("produces N sets each of SET_SIZE players", () => {
    const sets = dealSets(pool, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 });
    expect(sets).toHaveLength(3);
    for (const s of sets) expect(s.players).toHaveLength(13);
  });

  it("each set has correct position mix", () => {
    const sets = dealSets(pool, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 });
    for (const s of sets) {
      const counts: Record<string, number> = {};
      for (const p of s.players) counts[p.position] = (counts[p.position] || 0) + 1;
      expect(counts).toEqual({ GK: 2, DEF: 4, MID: 4, FWD: 3 });
    }
  });

  it("every pool player is dealt exactly once", () => {
    const sets = dealSets(pool, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 });
    const dealt = sets.flatMap((s) => s.players.map((p) => p.id));
    expect(dealt.sort()).toEqual(pool.map((p) => p.id).sort());
  });

  it("dealing is random — different RNG produces different sets", () => {
    const setsA = dealSets(pool, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 }, () => 0.1);
    const setsB = dealSets(pool, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 }, () => 0.9);
    const idsA = setsA.flatMap((s) => s.players.map((p) => `${s.index}-${p.id}`)).sort();
    const idsB = setsB.flatMap((s) => s.players.map((p) => `${s.index}-${p.id}`)).sort();
    expect(idsA).not.toEqual(idsB);
  });

  it("throws when pool too small for a position", () => {
    const small = pool.filter((p) => p.position !== "FWD");
    expect(() =>
      dealSets(small, 3, { GK: 2, DEF: 4, MID: 4, FWD: 3 }),
    ).toThrow();
  });
});

describe("setIndexForRound", () => {
  it("manager i holds set i in round 0", () => {
    expect(setIndexForRound(0, 0, 3)).toBe(0);
    expect(setIndexForRound(1, 0, 3)).toBe(1);
    expect(setIndexForRound(2, 0, 3)).toBe(2);
  });
  it("rotates forward each round", () => {
    expect(setIndexForRound(0, 1, 3)).toBe(1);
    expect(setIndexForRound(0, 2, 3)).toBe(2);
    expect(setIndexForRound(0, 3, 3)).toBe(0);
  });
  it("wraps around for last manager", () => {
    expect(setIndexForRound(2, 1, 3)).toBe(0);
    expect(setIndexForRound(2, 2, 3)).toBe(1);
  });
});

describe("bot draft pick", () => {
  const set: Player[] = [
    makePlayer({ id: "gk", position: "GK", rating: 75 }),
    makePlayer({ id: "d1", position: "DEF", rating: 80 }),
    makePlayer({ id: "m1", position: "MID", rating: 85 }),
    makePlayer({ id: "f1", position: "FWD", rating: 90 }),
  ];

  const botCtx = (counts: Record<Position, number>, difficulty: "easy" | "normal" | "hard" = "hard") => ({
    currentCounts: counts,
    difficulty,
    roundsRemaining: 10,
    draftedByBot: [],
  });

  it("picks toward balanced target and avoids filled GK", () => {
    // No GK yet -> may pick GK or high rating
    let picked = botDraftPick(set, botCtx({ GK: 0, DEF: 0, MID: 0, FWD: 0 }));
    // hard: pure rating -> picks FWD (90)
    expect(picked.id).toBe("f1");

    // GK filled -> avoid GK
    picked = botDraftPick(set, botCtx({ GK: 1, DEF: 0, MID: 0, FWD: 0 }));
    expect(picked.id).not.toBe("gk");
  });

  it("easy adds noise and can pick lower-rated", () => {
    // rng=0 always -> easy noise 0, pure rating picks f1
    expect(botDraftPick(set, botCtx({ GK: 0, DEF: 0, MID: 0, FWD: 0 }, "easy")).id).toBe("f1");
  });

  it("discourages picking position beyond max", () => {
    // DEF at max (4) -> should not pick DEF even if high rated
    const set2: Player[] = [
      makePlayer({ id: "d-hi", position: "DEF", rating: 99 }),
      makePlayer({ id: "m-lo", position: "MID", rating: 50 }),
    ];
    const picked = botDraftPick(set2, botCtx({ GK: 0, DEF: 4, MID: 0, FWD: 0 }));
    expect(picked.id).toBe("m-lo");
  });

  it("prioritizes filling minimum positions when rounds are running out", () => {
    // Only 1 round left, need 1 GK -> should pick GK even if lower rated
    const set3: Player[] = [
      makePlayer({ id: "gk-lo", position: "GK", rating: 60 }),
      makePlayer({ id: "f-hi", position: "FWD", rating: 90 }),
    ];
    const ctx = botCtx({ GK: 0, DEF: 0, MID: 0, FWD: 0 }, "hard");
    ctx.roundsRemaining = 1;
    const picked = botDraftPick(set3, ctx);
    expect(picked.id).toBe("gk-lo");
  });

  it("hard bot values chemistry - same nation gets bonus", () => {
    const set4: Player[] = [
      makePlayer({ id: "p-eng-1", position: "MID", rating: 74, nation: "England" }),
      makePlayer({ id: "p-esp-1", position: "MID", rating: 75, nation: "Spain" }),
    ];
    const ctx = botCtx({ GK: 0, DEF: 0, MID: 0, FWD: 0 }, "hard");
    ctx.draftedByBot = [makePlayer({ id: "p-eng-2", position: "DEF", rating: 70, nation: "England" })];
    // England MID (74 + 2 chem = 76) should be picked over Spain MID (75)
    const picked = botDraftPick(set4, ctx);
    expect(picked.id).toBe("p-eng-1");
  });
});

describe("autoArrange", () => {
  const players: Player[] = [
    makePlayer({ id: "p1", position: "GK", rating: 80 }),
    makePlayer({ id: "p2", position: "DEF", rating: 70 }),
    makePlayer({ id: "p3", position: "DEF", rating: 60 }),
    makePlayer({ id: "p4", position: "DEF", rating: 50 }),
    makePlayer({ id: "p5", position: "DEF", rating: 40 }),
    makePlayer({ id: "p6", position: "MID", rating: 70 }),
    makePlayer({ id: "p7", position: "MID", rating: 60 }),
    makePlayer({ id: "p8", position: "MID", rating: 50 }),
    makePlayer({ id: "p9", position: "FWD", rating: 70 }),
    makePlayer({ id: "p10", position: "FWD", rating: 60 }),
    makePlayer({ id: "p11", position: "FWD", rating: 50 }),
  ];

  it("matches brute force optimum on random squads", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    for (let t = 0; t < 5; t++) {
      // shuffle players
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      const a = autoArrange(shuffled, formation433);
      const b = bruteForceArrange(shuffled, formation433);
      expect(a.teamRating).toBe(b.teamRating);
    }
  });

  it("fills all 11 slots with no duplicate players", () => {
    const a = autoArrange(players, formation433);
    expect(a.slots).toHaveLength(11);
    const ids = a.slots.map((s) => s.player.id);
    expect(new Set(ids).size).toBe(11);
  });
});

describe("suggestBestFormation", () => {
  const players: Player[] = [
    makePlayer({ id: "p1", position: "GK", rating: 80 }),
    makePlayer({ id: "p2", position: "DEF", rating: 70 }),
    makePlayer({ id: "p3", position: "DEF", rating: 60 }),
    makePlayer({ id: "p4", position: "DEF", rating: 50 }),
    makePlayer({ id: "p5", position: "DEF", rating: 40 }),
    makePlayer({ id: "p6", position: "MID", rating: 70 }),
    makePlayer({ id: "p7", position: "MID", rating: 60 }),
    makePlayer({ id: "p8", position: "MID", rating: 50 }),
    makePlayer({ id: "p9", position: "FWD", rating: 70 }),
    makePlayer({ id: "p10", position: "FWD", rating: 60 }),
    makePlayer({ id: "p11", position: "FWD", rating: 50 }),
  ];

  const formations: Formation[] = [
    { id: "4-3-3", name: "4-3-3", slots: formation433.slots },
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
  ];

  it("returns top 3 sorted by team rating desc", () => {
    const top = suggestBestFormation(players, formations);
    expect(top.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].teamRating).toBeGreaterThanOrEqual(top[i].teamRating);
    }
    expect(top[0].rank).toBe(1);
  });
});

describe("tallyVotes", () => {
  it("winner is most votes", () => {
    const votes = [
      { voterMemberId: "v1", teamMemberId: "t1" },
      { voterMemberId: "v2", teamMemberId: "t1" },
      { voterMemberId: "v3", teamMemberId: "t2" },
    ];
    const ratings = { t1: 70, t2: 80 };
    const { winner, results } = tallyVotes(votes, ratings);
    expect(winner).toBe("t1");
    expect(results[0].votes).toBe(2);
  });
  it("ties broken by team rating", () => {
    const votes = [
      { voterMemberId: "v1", teamMemberId: "t1" },
      { voterMemberId: "v2", teamMemberId: "t2" },
    ];
    const ratings = { t1: 70, t2: 85 };
    const { winner, results } = tallyVotes(votes, ratings);
    expect(winner).toBe("t2");
    expect(results[0].teamMemberId).toBe("t2");
  });
  it("returns null winner on exact tie", () => {
    const votes = [
      { voterMemberId: "v1", teamMemberId: "t1" },
      { voterMemberId: "v2", teamMemberId: "t2" },
    ];
    const ratings = { t1: 80, t2: 80 };
    const { winner, ties } = tallyVotes(votes, ratings);
    expect(winner).toBeNull();
    expect(ties).toHaveLength(2);
  });
});

describe("validateLineupLockin", () => {
  const drafted = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"]);
  const formationIds = new Set(["4-3-3"]);

  it("accepts complete valid lineup", () => {
    const lineup = Array.from({ length: 11 }, (_, i) => ({
      slotIndex: i,
      playerId: `p${i + 1}`,
    }));
    const res = validateLineupLockin({ lineup, draftedPlayerIds: drafted, formationIds });
    expect(res.ok).toBe(true);
  });

  it("rejects incomplete lineup", () => {
    const lineup = [{ slotIndex: 0, playerId: "p1" }, null];
    const res = validateLineupLockin({ lineup, draftedPlayerIds: drafted, formationIds });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("11 slots");
  });

  it("rejects duplicates", () => {
    const lineup = Array.from({ length: 11 }, (_, i) => ({ slotIndex: i, playerId: "p1" }));
    const res = validateLineupLockin({ lineup, draftedPlayerIds: drafted, formationIds });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Duplicate");
  });

  it("rejects player not drafted", () => {
    const lineup = Array.from({ length: 11 }, (_, i) => ({ slotIndex: i, playerId: "unknown" }));
    const res = validateLineupLockin({ lineup, draftedPlayerIds: drafted, formationIds });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("not drafted");
  });
});
