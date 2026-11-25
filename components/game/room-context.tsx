"use client";

import * as React from "react";
import { createBrowserSupabaseClient, signInAnonymously } from "@/lib/supabase/browser";
import { dbPlayerToPlayer, dbRowsToEngineState } from "@/lib/game/sync";
import { reducer, createEngine, type EngineState, type EngineAction } from "@/lib/game/engine";
import {
  getRoomHydration,
  setMemberReady,
  pickPlayer,
  startDraft,
  startLineup,
  lockLineup,
  setLineupSlots,
  castVote,
  updateMemberConnected,
} from "@/app/actions/room";

interface RoomContextValue {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  memberId: string | null;
  roomId: string | null;
  hydrated: boolean;
  error: string | null;
  setReady: (ready: boolean) => void;
  handlePick: (playerId: string) => void;
  handleStartDraft: () => void;
  handleStartLineup: () => void;
  handleSelectFormation: (formationId: string) => void;
  handlePlace: (slotIndex: number, playerId: string | null) => void;
  handleAutoArrange: () => void;
  handleSuggest: () => void;
  handleLockLineup: () => void;
  handleVote: (teamMemberId: string) => void;
}

const RoomContext = React.createContext<RoomContextValue | null>(null);

export function RoomProvider({ code, children }: { code: string; children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, createEngine("You", 4, "normal", {}, []));
  const [memberId, setMemberId] = React.useState<string | null>(null);
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabaseRef = React.useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);
  const channelRef = React.useRef<any>(null);
  const botTimerRef = React.useRef<any>(null);

  const clearBotTimer = () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); };

  React.useEffect(() => {
    return () => {
      clearBotTimer();
      if (memberId && supabaseRef.current) {
        updateMemberConnected({ memberId, connected: false }).catch(() => {});
      }
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
      }
    };
  }, [memberId]);

  React.useEffect(() => {
    let cancelled = false;
    clearBotTimer();
    (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        supabaseRef.current = supabase;
        const userId = await signInAnonymously(supabase);
        const hydration = await getRoomHydration(code);
        if (!hydration || cancelled) return;
        const playersMap = new Map(hydration.players.map((p: any) => [p.id, dbPlayerToPlayer(p)]));
        const engineState = dbRowsToEngineState({
          room: hydration.room, members: hydration.members, sets: hydration.sets,
          setPlayers: hydration.setPlayers, picks: hydration.picks,
          lineups: hydration.lineups, lineupSlots: hydration.lineupSlots,
          votes: hydration.votes, playersMap,
        });
        let myMember = hydration.members.find((m: any) => m.user_id === userId);
        let isNew = false;
        if (!myMember) {
          const { data, error: insertError } = await supabase
            .from("room_members")
            .insert({ room_id: hydration.room.id, display_name: "You", is_bot: false, seat: hydration.members.length, ready: false, connected: true })
            .select().single();
          if (insertError) throw insertError;
          myMember = data; isNew = true;
        }
        if (isNew) {
          const hydration2 = await getRoomHydration(code);
          if (hydration2 && !cancelled) {
            const playersMap2 = new Map(hydration2.players.map((p: any) => [p.id, dbPlayerToPlayer(p)]));
            const engineState2 = dbRowsToEngineState({
              room: hydration2.room, members: hydration2.members, sets: hydration2.sets,
              setPlayers: hydration2.setPlayers, picks: hydration2.picks,
              lineups: hydration2.lineups, lineupSlots: hydration2.lineupSlots,
              votes: hydration2.votes, playersMap: playersMap2,
            });
            dispatch({ type: "RESET", state: engineState2 });
          }
        } else {
          dispatch({ type: "RESET", state: engineState });
        }
        setMemberId(myMember.id);
        setRoomId(hydration.room.id);
        setHydrated(true);
      } catch (e) {
        console.error("hydrate error", e);
        setError(e instanceof Error ? e.message : "Failed to load room");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  React.useEffect(() => {
    if (!roomId || !supabaseRef.current) return;
    const supabase = supabaseRef.current;
    const channel = supabase.channel(`room:${roomId}`);
    channelRef.current = channel;
    const resync = () => {
      (async () => {
        try {
          const hydration = await getRoomHydration(code);
          if (!hydration) return;
          const playersMap = new Map(hydration.players.map((p: any) => [p.id, dbPlayerToPlayer(p)]));
          const engineState = dbRowsToEngineState({
            room: hydration.room, members: hydration.members, sets: hydration.sets,
            setPlayers: hydration.setPlayers, picks: hydration.picks,
            lineups: hydration.lineups, lineupSlots: hydration.lineupSlots,
            votes: hydration.votes, playersMap,
          });
          dispatch({ type: "RESET", state: engineState });
          driveBots(engineState);
        } catch (e) { console.error("resync error", e); }
      })();
    };
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "set_players", filter: `room_id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "picks", filter: `room_id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "lineups", filter: `room_id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "lineup_slots", filter: `room_id=eq.${roomId}` }, resync)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `room_id=eq.${roomId}` }, resync)
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED" && memberId) updateMemberConnected({ memberId, connected: true }).catch(() => {});
      });
    return () => {
      if (memberId) updateMemberConnected({ memberId, connected: false }).catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [roomId, code, memberId]);

  const driveBots = React.useCallback((s: EngineState) => {
    clearBotTimer();
    const myMember = s.members.find((m) => m.id === memberId);
    if (!myMember || myMember.seat !== 0) return;
    if (s.phase !== "drafting") return;
    const botsPending = s.members.filter((m) => m.isBot && !s.pickedThisRoundAvatars[m.id]);
    if (botsPending.length > 0) {
      botTimerRef.current = setTimeout(() => dispatch({ type: "BOT_TURN" }), 700);
    }
  }, [memberId]);

  React.useEffect(() => { driveBots(state); }, [state, driveBots]);

  const setReady = React.useCallback((ready: boolean) => {
    if (!memberId) return;
    dispatch({ type: "SET_READY", memberId, ready });
    setMemberReady({ memberId, ready }).catch(() => {});
  }, [memberId]);

  const handlePick = React.useCallback((playerId: string) => {
    if (!memberId) return;
    dispatch({ type: "PICK", memberId, playerId });
    pickPlayer({ memberId, playerId, round: state.round }).catch(() => {});
  }, [memberId, state.round]);

  const handleStartDraft = React.useCallback(() => {
    if (!roomId) return;
    dispatch({ type: "START_DRAFT" });
    startDraft({ roomId }).catch(() => {});
  }, [roomId]);

  const handleStartLineup = React.useCallback(() => {
    if (!roomId) return;
    startLineup({ roomId }).catch(() => {});
  }, [roomId]);

  const handleSelectFormation = React.useCallback((formationId: string) => {
    if (!memberId) return;
    dispatch({ type: "LINEUP_SELECT_FORMATION", memberId, formationId });
  }, [memberId]);

  const handlePlace = React.useCallback((slotIndex: number, playerId: string | null) => {
    if (!memberId) return;
    dispatch({ type: "LINEUP_PLACE", memberId, slotIndex, playerId });
  }, [memberId]);

  const handleAutoArrange = React.useCallback(() => {
    if (!memberId) return;
    dispatch({ type: "LINEUP_AUTO", memberId });
  }, [memberId]);

  const handleSuggest = React.useCallback(() => {
    if (!memberId) return;
    dispatch({ type: "LINEUP_SUGGEST", memberId });
  }, [memberId]);

  const handleLockLineup = React.useCallback(() => {
    if (!memberId) return;
    const lineup = state.lineups[memberId];
    if (!lineup || !lineup.formationId) return;
    const slots = lineup.slots.map((sl: any) => ({ slotIndex: sl.slotIndex, playerId: sl.playerId }));
    // find lineup row id
    (async () => {
      const hydration = await getRoomHydration(code);
      if (!hydration) return;
      const myLineup = hydration.lineups.find((l: any) => l.member_id === memberId);
      if (myLineup && lineup.formationId) {
        await setLineupSlots({ lineupId: myLineup.id, slots });
        await lockLineup({ memberId, formationId: lineup.formationId });
      }
    })();
    dispatch({ type: "LINEUP_LOCK", memberId });
  }, [memberId, code, state]);

  const handleVote = React.useCallback((teamMemberId: string) => {
    if (!memberId) return;
    dispatch({ type: "VOTE", voterMemberId: memberId, teamMemberId });
    castVote({ voterMemberId: memberId, teamMemberId }).catch(() => {});
  }, [memberId]);

  const value: RoomContextValue = {
    state, dispatch, memberId, roomId, hydrated, error,
    setReady, handlePick, handleStartDraft, handleStartLineup,
    handleSelectFormation, handlePlace, handleAutoArrange, handleSuggest,
    handleLockLineup, handleVote,
  };

  return (
    <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = React.useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}
