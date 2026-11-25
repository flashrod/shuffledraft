"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reducer, createEngine, type EngineState, type EngineAction } from "@/lib/game/engine";
import { DraftScreen } from "@/components/game/draft-screen";
import { LineupScreen } from "@/components/game/lineup-screen";
import { VoteScreen } from "@/components/game/vote-screen";
import { ResultsScreen } from "@/components/game/results-screen";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GAME } from "@/lib/config";

const initialEngine = createEngine("You", 4, "normal");

export function GameShell() {
  const [state, dispatch] = React.useReducer(reducer, initialEngine);
  const human = state.members[0];
  const allReady = state.members.every((m) => m.ready);

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <Sonner />
      {state.phase === "lobby" && (
        <LobbyScreen state={state} dispatch={dispatch} human={human} allReady={allReady} />
      )}
      {state.phase === "drafting" && <DraftScreen state={state} dispatch={dispatch} />}
      {state.phase === "lineup" && <LineupScreen state={state} dispatch={dispatch} />}
      {state.phase === "voting" && <VoteScreen state={state} dispatch={dispatch} />}
      {state.phase === "finished" && <ResultsScreen state={state} dispatch={dispatch} />}
    </div>
  );
}

function LobbyScreen({
  state,
  dispatch,
  human,
  allReady,
}: {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  human: EngineState["members"][number];
  allReady: boolean;
}) {
  const bots = state.members.filter((m) => m.isBot).length;

  return (
    <div className="flex flex-col h-full p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shuffle Draft</h1>
            <p className="text-[var(--color-muted)] text-sm">Solo vs bots — set up the room</p>
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
            <Input
              defaultValue={human.displayName}
              className="w-full bg-transparent border-b border-[var(--color-border)] focus:border-black px-0 text-[var(--color-ink)] placeholder-[var(--color-muted-soft)]"
            />
          </CardContent>
        </Card>

        <Card className="mb-7 border-transparent">
          <CardHeader className="p-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Managers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-wrap gap-2 p-4">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Button
                  key={n}
                  onClick={() => dispatch({ type: "SET_MANAGERS", n })}
                  className={cn(
                    "border-[var(--color-border)] hover:bg-white/50 hover:border-black/30 text-xs font-medium",
                    n === state.nManagers
                      ? "border-black bg-black text-white"
                      : "text-[var(--color-ink-soft)]",
                  )}
                >
                  {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-10 border-transparent">
          <CardHeader className="p-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Host settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-5 p-4">
            <div className="grid grid-cols-2 gap-2">
              {[15, 30, 60, null].map((t) => (
                <Button
                  key={String(t)}
                  onClick={() => dispatch({ type: "SET_PICK_TIMER", seconds: t })}
                  className={cn(
                    "border-[var(--color-border)] hover:bg-white/50 hover:border-black/30 text-xs font-medium",
                    state.config.pickTimer === t
                      ? "border-black bg-black text-white"
                      : "text-[var(--color-ink-soft)]",
                  )}
                >
                  {t === null ? "Off" : `${t}s pick`}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[60, 120, 180, null].map((t) => (
                <Button
                  key={String(t)}
                  onClick={() => dispatch({ type: "SET_LINEUP_TIMER", seconds: t })}
                  className={cn(
                    "border-[var(--color-border)] hover:bg-white/50 hover:border-black/30 text-xs font-medium",
                    state.config.lineupTimer === t
                      ? "border-black bg-black text-white"
                      : "text-[var(--color-ink-soft)]",
                  )}
                >
                  {t === null ? "Off" : `${t}s lineup`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() =>
              dispatch({
                type: "SET_READY",
                memberId: human.id,
                ready: !human.ready,
              })
            }
            className="w-full lg:w-auto flex-1 bg-white border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink)]"
          >
            {human.ready ? "Not ready" : "I'm ready"}
          </Button>
          <Button
            onClick={() => dispatch({ type: "START_DRAFT" })}
            disabled={!allReady}
            className={cn(
              "w-full lg:w-auto flex-1",
              allReady
                ? "bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)]"
                : "bg-transparent border-[var(--color-border)] text-[var(--color-muted)] cursor-not-allowed",
            )}
          >
            Start draft
          </Button>
        </div>

        {allReady && (
          <p className="mt-6 text-center text-xs text-[var(--color-pale-green-text)] font-medium">
            Everyone ready — host can start the draft.
          </p>
        )}
      </div>
    </div>
  );
}
