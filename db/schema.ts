import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const positionEnum = pgEnum("position", ["GK", "DEF", "MID", "FWD"]);

export const roomStatusEnum = pgEnum("room_status", [
  "lobby",
  "drafting",
  "lineup",
  "voting",
  "finished",
]);

export const roomModeEnum = pgEnum("room_mode", ["current", "icons", "mixed"]);

export const botDifficultyEnum = pgEnum("bot_difficulty", [
  "easy",
  "normal",
  "hard",
]);

/* ------------------------------------------------------------------ */
/* players                                                            */
/* ------------------------------------------------------------------ */

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull(),
    source: text("source").notNull(), // api-football | wikidata | seed
    name: text("name").notNull(),
    position: positionEnum("position").notNull(),
    detailedPosition: text("detailed_position"), // e.g. LB, CB, CDM, CAM, LW, ST
    nation: text("nation").notNull(),
    nationEmoji: text("nation_emoji"),
    club: text("club"),
    league: text("league"),
    isIcon: boolean("is_icon").default(false).notNull(),
    rating: integer("rating").notNull(), // 50-99 draft rating
    ratingOverride: integer("rating_override"), // admin override, null = use computed
    tier: text("tier"), // S | A | B | C (icons)
    included: boolean("included").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    externalIdSourceIdx: index("players_external_id_source_idx").on(
      t.externalId,
      t.source
    ),
    includedIdx: index("players_included_idx").on(t.included),
    positionIdx: index("players_position_idx").on(t.position),
  }),
);

/* ------------------------------------------------------------------ */
/* rooms                                                              */
/* ------------------------------------------------------------------ */

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // 6-char join code
    hostId: text("host_id").notNull(),
    status: roomStatusEnum("status").default("lobby").notNull(),
    mode: roomModeEnum("mode").default("current").notNull(),
    config: jsonb("config").notNull().$type<{
      buffer?: number;
      positionMix?: { GK: number; DEF: number; MID: number; FWD: number };
      pickTimer?: 15 | 30 | 60 | null;
      lineupTimer?: 60 | 120 | 180 | null;
      botsVote?: boolean;
      nationFilter?: string[];
      leagueFilter?: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    codeIdx: unique("rooms_code_idx").on(t.code),
  }),
);

/* ------------------------------------------------------------------ */
/* room_members                                                       */
/* ------------------------------------------------------------------ */

export const roomMembers = pgTable(
  "room_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id"), // anonymous auth user id, null for bots
    displayName: text("display_name").notNull(),
    isBot: boolean("is_bot").default(false).notNull(),
    botDifficulty: botDifficultyEnum("bot_difficulty"),
    seat: integer("seat").notNull(), // 0..N-1
    ready: boolean("ready").default(false).notNull(),
    connected: boolean("connected").default(true).notNull(),
  },
  (t) => ({
    roomSeatIdx: index("room_members_room_seat_idx").on(t.roomId, t.seat),
    roomUserIdx: index("room_members_room_user_idx").on(t.roomId, t.userId),
  }),
);

/* ------------------------------------------------------------------ */
/* sets / set_players                                                 */
/* ------------------------------------------------------------------ */

export const sets = pgTable(
  "sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    index: integer("index").notNull(), // 0..N-1
  },
  (t) => ({
    roomIndexIdx: index("sets_room_index_idx").on(t.roomId, t.index),
  }),
);

export const setPlayers = pgTable(
  "set_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    takenByMemberId: uuid("taken_by_member_id").references(
      () => roomMembers.id,
      { onDelete: "set null" },
    ),
    takenRound: integer("taken_round"), // null until taken
  },
  (t) => ({
    setIdx: index("set_players_set_idx").on(t.setId),
    takenByIdx: index("set_players_taken_by_idx").on(t.takenByMemberId),
  }),
);

/* ------------------------------------------------------------------ */
/* picks                                                              */
/* ------------------------------------------------------------------ */

export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => roomMembers.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    round: integer("round").notNull(), // 1..11
    slot: text("slot"), // natural position group: GK | DEF | MID | FWD
  },
  (t) => ({
    roomRoundIdx: index("picks_room_round_idx").on(t.roomId, t.round),
  }),
);

/* ------------------------------------------------------------------ */
/* lineups / lineup_slots                                             */
/* ------------------------------------------------------------------ */

export const lineups = pgTable(
  "lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => roomMembers.id, { onDelete: "cascade" }),
    formationId: text("formation_id").notNull(),
    locked: boolean("locked").default(false).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    memberIdx: index("lineups_member_idx").on(t.memberId),
  }),
);

export const lineupSlots = pgTable(
  "lineup_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id")
      .notNull()
      .references(() => lineups.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(), // 0..10
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
  },
  (t) => ({
    lineupSlotIdx: index("lineup_slots_lineup_idx").on(t.lineupId),
    uniqueSlot: unique("lineup_slots_lineup_slot_idx").on(
      t.lineupId,
      t.slotIndex,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/* votes                                                              */
/* ------------------------------------------------------------------ */

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    voterMemberId: uuid("voter_member_id")
      .notNull()
      .references(() => roomMembers.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => roomMembers.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniqueVote: unique("votes_voter_team_idx").on(
      t.voterMemberId,
      t.teamMemberId,
    ),
  }),
);

/* ------------------------------------------------------------------ */
/* formations (config)                                                */
/* ------------------------------------------------------------------ */

export const formations = pgTable(
  "formations",
  {
    id: text("id").primaryKey(), // e.g. "4-3-3"
    name: text("name").notNull(),
    slots: jsonb("slots").notNull().$type<Array<{
      role: string;
      line: "GK" | "DEF" | "MID" | "FWD";
      x: number; // 0-100
      y: number; // 0-100
    }>>(),
    usageShare: text("usage_share"), // optional "X%" note
  },
  (t) => ({
    idIdx: unique("formations_id_idx").on(t.id),
  }),
);

/* ------------------------------------------------------------------ */
/* formation_usage (optional import)                                  */
/* ------------------------------------------------------------------ */

export const formationUsage = pgTable(
  "formation_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formationId: text("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    league: text("league").notNull(),
    season: text("season").notNull(),
    matches: integer("matches").notNull().default(0),
    share: text("share").notNull(), // "X%"
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    formationIdx: index("formation_usage_formation_idx").on(t.formationId),
  }),
);

/* ------------------------------------------------------------------ */
/* import_log                                                         */
/* ------------------------------------------------------------------ */

export const importLog = pgTable(
  "import_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    status: text("status").notNull(), // started | completed | failed
    playersUpserted: integer("players_upserted").default(0).notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
);

/* ------------------------------------------------------------------ */
/* Relations                                                          */
/* ------------------------------------------------------------------ */

export const roomsRelations = relations(rooms, ({ many }) => ({
  members: many(roomMembers),
  sets: many(sets),
  picks: many(picks),
  lineups: many(lineups),
  votes: many(votes),
}));

export const roomMembersRelations = relations(roomMembers, ({ one, many }) => ({
  room: one(rooms, { fields: [roomMembers.roomId], references: [rooms.id] }),
  picks: many(picks),
  lineups: many(lineups),
  votesCast: many(votes, { relationName: "voter" }),
  votesReceived: many(votes, { relationName: "team" }),
}));

export const setsRelations = relations(sets, ({ one, many }) => ({
  room: one(rooms, { fields: [sets.roomId], references: [rooms.id] }),
  players: many(setPlayers),
}));

export const setPlayersRelations = relations(setPlayers, ({ one }) => ({
  set: one(sets, { fields: [setPlayers.setId], references: [sets.id] }),
  player: one(players, { fields: [setPlayers.playerId], references: [players.id] }),
  takenBy: one(roomMembers, {
    fields: [setPlayers.takenByMemberId],
    references: [roomMembers.id],
  }),
}));

export const picksRelations = relations(picks, ({ one }) => ({
  room: one(rooms, { fields: [picks.roomId], references: [rooms.id] }),
  member: one(roomMembers, { fields: [picks.memberId], references: [roomMembers.id] }),
  player: one(players, { fields: [picks.playerId], references: [players.id] }),
}));

export const lineupsRelations = relations(lineups, ({ one, many }) => ({
  room: one(rooms, { fields: [lineups.roomId], references: [rooms.id] }),
  member: one(roomMembers, { fields: [lineups.memberId], references: [roomMembers.id] }),
  slots: many(lineupSlots),
}));

export const lineupSlotsRelations = relations(lineupSlots, ({ one }) => ({
  lineup: one(lineups, { fields: [lineupSlots.lineupId], references: [lineups.id] }),
  player: one(players, { fields: [lineupSlots.playerId], references: [players.id] }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  room: one(rooms, { fields: [votes.roomId], references: [rooms.id] }),
  voter: one(roomMembers, {
    fields: [votes.voterMemberId],
    references: [roomMembers.id],
    relationName: "voter",
  }),
  team: one(roomMembers, {
    fields: [votes.teamMemberId],
    references: [roomMembers.id],
    relationName: "team",
  }),
}));
