"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast, Toaster as Sonner } from "sonner";
import { DraftCard } from "@/components/game/draft-card";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { GAME } from "@/lib/config";
import type { Player } from "@/lib/game";

const POSITION_LABEL: Record<string, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

export function DraftScreen({ state, dispatch }: { state: EngineState; dispatch: React.Dispatch<EngineAction> }) {
  const human = state.members[0];
  const humanDrafted = state.drafted[human.id] ?? [];
  const holdIdx = state.round < GAME.ROUNDS ? (human.seat + state.round) % state.nManagers : -1;
  const holdSet = state.sets.find((s) => s.index === holdIdx) ?? null;

  const tally = humanDrafted.reduce(
    (acc, d) => { acc[d.player.position as keyof typeof acc]++; return acc; },
    { GK: 0, DEF: 0, MID: 0, FWD: 0 },
  );
  const provisional = state.teamRatings[human.id] ?? 0;

  const handlePick = (player: Player) => {
    dispatch({ type: "PICK", memberId: human.id, playerId: player.id });
    const botsPending = state.members.filter((m) => m.isBot && !state.pickedThisRoundAvatars[m.id]);
    if (botsPending.length > 0) {
      setTimeout(() => dispatch({ type: "BOT_TURN" }), 400);
    }
  };

  React.useEffect(() => {
    if (state.phase !== "drafting" || !state.config.pickTimer || state.timerSecondsLeft == null) return;
    if (state.timerSecondsLeft <= 0) {
      dispatch({ type: "BOT_TURN" });
      return;
    }
    const t = setInterval(() => {
      if (state.timerSecondsLeft == null) return;
      dispatch({ type: "TICK", secondsLeft: state.timerSecondsLeft - 1 });
    }, 1000);
    return () => clearInterval(t);
  }, [state, dispatch]);

  return (
    <div className="flex flex-col h-full">
      <Sonner />
      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
            <span className="font-mono">Round {state.round + 1} / {GAME.ROUNDS}</span>
            <span>·</span>
            <span>{state.statusMessage}</span>
          </div>
          <h2 className="text-lg font-bold">Shuffle Draft</h2>
        </div>
        <div className="flex items-center gap-3">
          {state.config.pickTimer && state.timerSecondsLeft != null ? (
            <div className="w-32">
              <Progress value={(state.timerSecondsLeft / state.config.pickTimer) * 100} />
            </div>
          ) : null}
          <Badge variant="outline">{humanDrafted.length}/{GAME.XI_SIZE}</Badge>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <main className="flex-1 min-w-0 p-5 lg:p-8 overflow-y-auto">
          <Card className="mb-6 border-transparent hover:border-black/30">
            <CardHeader className="flex flex-row items-center justify-between p-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Your set</CardTitle>
              <CardDescription className="text-xs text-[var(--color-muted)]">Pick one player. Sets rotate each round.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {holdSet ? (
                <div className="space-y-3">
                  {["GK", "DEF", "MID", "FWD"].map((pos) => {
                    const players = holdSet.players.filter((p) => p.position === pos);
                    if (players.length === 0) return null;
                    return (
                      <div key={pos} className="mb-2">
                        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-muted-soft)] mb-2">{POSITION_LABEL[pos]}</h3>
                        <div className="flex flex-wrap gap-2">
                          {players.map((p) => (
                            <DraftCard
                              key={p.id}
                              player={p}
                              selected={false}
                              onSelect={(sel) => handlePick(sel)}
                              inSet
                              positionTally={tally}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--color-muted)] text-sm">No set available this round.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--color-pale-yellow-text)]/20 bg-[var(--color-pale-yellow-bg)]">
            <CardHeader className="p-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-pale-yellow-text)] mb-2">
                <span>Note</span> Squad balance
              </div>
              <div className="flex gap-4 text-sm">
                {["GK", "DEF", "MID", "FWD"].map((pos) => (
                  <span key={pos} className="flex items-center gap-1">
                    {pos} <span className="font-mono">{tally[pos as keyof typeof tally]}</span>
                  </span>
                ))}
              </div>
              {tally.GK === 0 && state.round >= 6 && (
                <p className="mt-2 text-xs text-[var(--color-pale-red-text)]">No goalkeeper yet (round {state.round + 1}).</p>
              )}
            </CardHeader>
          </Card>
        </main>

        <aside className="lg:w-[400px] border-l border-[var(--color-border)] bg-white p-5 lg:p-8 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your XI (drafted)</h3>
              <span className="text-xs font-mono text-[var(--color-muted)]">Provisional {provisional}</span>
            </div>
            <div className="space-y-2">
              {["GK", "DEF", "MID", "FWD"].map((pos) => {
                const players = humanDrafted.filter((d) => d.player.position === pos);
                if (players.length === 0) return null;
                return (
                  <div key={pos} className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-soft)]">{POSITION_LABEL[pos]}</span>
                    <div className="flex flex-wrap gap-1">
                      {players.map((d) => (
                        <Badge key={d.player.id} variant="outline" className="text-xs">
                          {d.player.nation} {d.player.name} ({d.player.rating})
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              {humanDrafted.length === 0 && <div className="text-xs text-[var(--color-muted)] italic">No players drafted yet.</div>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
