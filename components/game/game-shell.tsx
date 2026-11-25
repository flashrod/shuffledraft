"use client";

import * as React from "react";
import { motion } from "framer-motion";
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

const initialEngine = createEngine("You", 4, "normal", {}, []);

export function GameShell() {
  const [state, dispatch] = React.useReducer(reducer, initialEngine);
  const human = state.members[0];
  const allReady = state.members.every((m) => m.ready);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-ink)]">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10"
        >
          <div>
            <h1 className="text-[32px] font-bold tracking-tighter leading-none uppercase">Shuffle Draft</h1>
            <p className="text-[var(--color-ink-dim)] text-[9px] uppercase tracking-wider">Solo vs bots — set up the room</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline">{state.nManagers}/{GAME.MAX_MANAGERS} managers</Badge>
            <Badge variant="outline">{bots} bots</Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transitionDelay: "0.1s" }}
          className="mb-7 border-none p-0"
        >
          <CardHeader className="p-5 border-b border-[var(--color-border)]">
            <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">Your name</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Input defaultValue={human.displayName} className="w-full bg-transparent border-b border-[var(--color-border)] focus:border-[var(--color-accent)] px-0 text-[var(--color-ink)] placeholder-[var(--color-ink-dim)]" />
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transitionDelay: "0.2s" }}
          className="mb-7 border-none p-0"
        >
          <CardHeader className="p-5 border-b border-[var(--color-border)]">
            <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">Managers</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-[1px] p-4 bg-[var(--color-border)]">
            <div className="flex flex-wrap gap-[1px]">
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <Button
                  key={n}
                  onClick={() => dispatch({ type: "SET_MANAGERS", n })}
                  className={cn(
                    "border-none bg-transparent text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)]/50 text-[9px] font-bold uppercase tracking-wider",
                    n === state.nManagers
                      ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
                      : "",
                  )}
                >
                  {n}
                </Button>
              ))}
            </div>
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transitionDelay: "0.3s" }}
          className="mb-10 border-none p-0"
        >
          <CardHeader className="p-5 border-b border-[var(--color-border)]">
            <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">Host settings</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-[1px] p-4 bg-[var(--color-border)]">
            <div className="grid grid-cols-2 gap-[1px]">
              {[15, 30, 60, null].map((t) => (
                <Button
                  key={String(t)}
                  onClick={() => dispatch({ type: "SET_PICK_TIMER", seconds: t })}
                  className={cn(
                    "border-none bg-transparent text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)]/50 text-[9px] font-bold uppercase tracking-wider",
                    state.config.pickTimer === t
                      ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
                      : "",
                  )}
                >
                  {t === null ? "Off" : `${t}s pick`}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-[1px]">
              {[60, 120, 180, null].map((t) => (
                <Button
                  key={String(t)}
                  onClick={() => dispatch({ type: "SET_LINEUP_TIMER", seconds: t })}
                  className={cn(
                    "border-none bg-transparent text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)]/50 text-[9px] font-bold uppercase tracking-wider",
                    state.config.lineupTimer === t
                      ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
                      : "",
                  )}
                >
                  {t === null ? "Off" : `${t}s lineup`}
                </Button>
              ))}
            </div>
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transitionDelay: "0.4s" }}
          className="flex items-center justify-between gap-3"
        >
          <Button
            onClick={() =>
              dispatch({
                type: "SET_READY",
                memberId: human.id,
                ready: !human.ready,
              })
            }
            className="w-full lg:w-auto flex-1 bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink)] text-[9px] font-bold uppercase tracking-wider"
          >
            {human.ready ? "Not ready" : "I'm ready"}
          </Button>
          <Button
            onClick={() => dispatch({ type: "START_DRAFT" })}
            disabled={!allReady}
            className={cn(
              "w-full lg:w-auto flex-1 text-[9px] font-bold uppercase tracking-wider",
              allReady
                ? "bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)] hover:bg-[var(--color-ink-dim)] hover:border-[var(--color-ink-dim)]"
                : "bg-transparent border-[var(--color-border)] text-[var(--color-ink-dim)] cursor-not-allowed",
            )}
          >
            Start draft
          </Button>
        </motion.div>

        {allReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 text-center text-[9px] text-[var(--color-terminal-green)] font-bold uppercase tracking-wider"
          >
            Everyone ready — host can start the draft.
          </motion.div>
        )}
      </div>
    </div>
  );
}
