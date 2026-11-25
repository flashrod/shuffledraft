"use client";

import * as React from "react";
import { useRoom } from "@/components/game/room-context";
import { RoomProvider } from "@/components/game/room-context";
import { DraftScreen } from "@/components/game/draft-screen";
import { LineupScreen } from "@/components/game/lineup-screen";
import { VoteScreen } from "@/components/game/vote-screen";
import { ResultsScreen } from "@/components/game/results-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GAME } from "@/lib/config";
import type { EngineState, EngineAction } from "@/lib/game/engine";

function MPLobby({
  state,
  dispatch,
  setReady,
  handleStartDraft,
}: {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  setReady: (ready: boolean) => void;
  handleStartDraft: () => void;
}) {
  const human = state.members[0];
  const allReady = state.members.every((m) => m.ready);
  const bots = state.members.filter((m) => m.isBot).length;

  return (
    <div className="flex flex-col h-full p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shuffle Draft</h1>
            <p className="text-[var(--color-muted)] text-sm">Multiplayer lobby</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline">{state.nManagers}/{GAME.MAX_MANAGERS} managers</Badge>
            <Badge variant="outline">{bots} bots</Badge>
          </div>
        </div>

        <Card className="mb-7 border-transparent">
          <CardHeader className="p-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Your name</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Input defaultValue={human.displayName} className="w-full bg-transparent border-b border-[var(--color-border)] focus:border-black px-0 text-[var(--color-ink)] placeholder-[var(--color-muted-soft)]" />
          </CardContent>
        </Card>

        <Card className="mb-7 border-transparent">
          <CardHeader className="p-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Managers</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2 p-4">
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Button key={n} onClick={() => dispatch({ type: "SET_MANAGERS", n })}
                  className={cn("border-[var(--color-border)] hover:bg-white/50 hover:border-black/30 text-xs font-medium",
                    n === state.nManagers ? "border-black bg-black text-white" : "text-[var(--color-ink-soft)]")}>
                  {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => setReady(!human.ready)} className="w-full lg:w-auto flex-1 bg-white border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink)]">
            {human.ready ? "Not ready" : "I'm ready"}
          </Button>
          <Button onClick={handleStartDraft} disabled={!allReady}
            className={cn("w-full lg:w-auto flex-1", allReady ? "bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)]" : "bg-transparent border-[var(--color-border)] text-[var(--color-muted)] cursor-not-allowed")}>
            Start draft
          </Button>
        </div>
        {allReady && <p className="mt-5 text-center text-xs text-[var(--color-pale-green-text)] font-medium">Everyone ready — host can start the draft.</p>}
      </div>
    </div>
  );
}

export function RoomInner({ code }: { code: string }) {
  const {
    state, dispatch, memberId, roomId, hydrated, error,
    setReady, handlePick, handleStartDraft, handleStartLineup,
    handleSelectFormation, handlePlace, handleAutoArrange, handleSuggest,
    handleLockLineup, handleVote,
  } = useRoom();

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <Card className="p-8 border-[var(--color-pale-red-text)]/20 bg-[var(--color-pale-red-bg)]">
          <CardTitle className="text-[var(--color-pale-red-text)] font-bold">{error}</CardTitle>
        </Card>
      </div>
    );
  }
  if (!hydrated) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <p className="text-[var(--color-muted)]">Loading room…</p>
      </div>
    );
  }

  const myMember = state.members.find((m) => m.id === memberId);

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
      {state.phase === "lobby" && (
        <MPLobby state={state} dispatch={dispatch} setReady={setReady} handleStartDraft={handleStartDraft} />
      )}
      {state.phase === "drafting" && (
        <DraftScreen state={state} dispatch={dispatch} onPick={handlePick} />
      )}
      {state.phase === "lineup" && (
        <LineupScreen state={state} dispatch={dispatch} onSelectFormation={handleSelectFormation} onPlace={handlePlace} onAutoArrange={handleAutoArrange} onSuggest={handleSuggest} onLockLineup={handleLockLineup} />
      )}
      {state.phase === "voting" && (
        <VoteScreen state={state} dispatch={dispatch} onVote={handleVote} />
      )}
      {state.phase === "finished" && (
        <ResultsScreen state={state} dispatch={dispatch} />
      )}
      {!myMember && (
        <div className="flex-1 items-center justify-center">
          <p className="text-[var(--color-muted)]">You are not in this room.</p>
        </div>
      )}
    </div>
  );
}

export default function RoomPage({ params }: { params: { code: string } }) {
  return (
    <RoomProvider code={params.code}>
      <RoomInner code={params.code} />
    </RoomProvider>
  );
}
