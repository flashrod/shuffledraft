"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster as Sonner } from "sonner";
import { Board } from "@/components/game/board";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { GAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

export function DraftScreen({ state, dispatch }: { state: EngineState; dispatch: React.Dispatch<EngineAction> }) {
  const human = state.members[0];
  const humanDrafted = state.drafted[human.id] ?? [];
  const holdIdx = state.round < GAME.ROUNDS ? (human.seat + state.round) % state.nManagers : -1;
  const holdSet = state.sets.find((s) => s.index === holdIdx) ?? null;

  const provisional = state.teamRatings[human.id] ?? 0;

  const [xiExpanded, setXiExpanded] = React.useState(false);

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
      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] uppercase tracking-[0.14em]">
            <span className="number-mono">Round {state.round + 1} / {GAME.ROUNDS}</span>
            <span className="w-px h-3 bg-[var(--color-border-strong)]"></span>
            <span>{state.statusMessage}</span>
          </div>
          <h2 className="text-lg font-bold">Shuffle Draft</h2>
        </div>
        <div className="flex items-center gap-4">
          {state.config.pickTimer && state.timerSecondsLeft != null ? (
            <div className="w-[140px] h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <Progress value={(state.timerSecondsLeft / state.config.pickTimer) * 100} className="h-full bg-[var(--color-pale-yellow-text)]" />
            </div>
          ) : null}
          <Badge variant="outline" className="number-mono text-sm">
            {humanDrafted.length}/{GAME.XI_SIZE}
          </Badge>
        </div>
      </header>

      <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
        {holdSet ? (
          <div className="px-1">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-muted-soft)] block mb-3">Your set — pick one player</span>
            <Board
              set={holdSet}
              onPick={handlePick}
              disabled={false}
            />
          </div>
        ) : (
          <div className="px-4 py-20 text-center">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-muted-soft)]">Your set</span>
            <p className="mt-2 text-sm text-[var(--color-muted)]">No set available this round.</p>
          </div>
        )}
      </main>

      {/* XI panel — fixed on mobile, side on desktop */}
      <aside className={cn(
        "border-t border-[var(--color-border)] bg-white shadow-sm",
        "lg:border-t-0 lg:border-l lg:border-[var(--color-border)] lg:w-[360px] lg:shadow-none",
      )}>
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Your XI (drafted)</h3>
              <p className="text-[10px] text-[var(--color-muted-soft)] uppercase tracking-[0.12em]">
                Provisional {provisional}
              </p>
            </div>
            <Button
              onClick={() => setXiExpanded(!xiExpanded)}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[10px]"
            >
              {xiExpanded ? "Collapse" : "View XI"}
            </Button>
          </div>

          {xiExpanded && (
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              {humanDrafted.length === 0 ? (
                <div className="text-center py-4 text-sm text-[var(--color-muted)] italic">
                  No players drafted yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {humanDrafted.map((d) => (
                    <div
                      key={d.player.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border border-transparent hover:bg-white/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[9px] font-mono leading-none">{d.player.nation}</span>
                        <span className="text-sm truncate">{d.player.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-bold leading-none", posColor(d.player.position))}>
                          {d.player.position}
                        </span>
                        <span className="number-mono text-xs font-bold">{d.player.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "bg-[var(--color-pale-blue-bg)] text-[var(--color-pale-blue-text)] border-[var(--color-pale-blue-text)]/30";
    case "DEF": return "bg-[var(--color-pale-green-bg)] text-[var(--color-pale-green-text)] border-[var(--color-pale-green-text)]/30";
    case "MID": return "bg-[var(--color-pale-yellow-bg)] text-[var(--color-pale-yellow-text)] border-[var(--color-pale-yellow-text)]/30";
    case "FWD": return "bg-[var(--color-pale-red-bg)] text-[var(--color-pale-red-text)] border-[var(--color-pale-red-text)]/30";
  }
  return "border-[var(--color-border)] text-[var(--color-muted)]";
}
