"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast, Toaster as Sonner, useSonner } from "sonner";
import { Board } from "@/components/game/board";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { GAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

interface DraftScreenProps {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  onPick?: (playerId: string) => void;
  onReady?: (ready: boolean) => void;
  onStartDraft?: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

const boardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function DraftScreen({ state, dispatch, onPick, onReady, onStartDraft }: DraftScreenProps) {
  const human = state.members[0];
  const humanDrafted = state.drafted[human.id] ?? [];
  const holdIdx = state.round < GAME.ROUNDS ? (human.seat + state.round) % state.nManagers : -1;
  const holdSet = state.sets.find((s) => s.index === holdIdx) ?? null;

  const provisional = state.teamRatings[human.id] ?? 0;
  const [xiExpanded, setXiExpanded] = React.useState(false);

  const handlePick = (player: Player) => {
    dispatch({ type: "PICK", memberId: human.id, playerId: player.id });
    onPick?.(player.id);
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
      <header className="flex flex-col gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[9px] text-[var(--color-ink-dim)] uppercase tracking-wider">
            <span className="number-mono">Round {state.round + 1} / {GAME.ROUNDS}</span>
            <span className="w-px h-3 bg-[var(--color-border-bright)]"></span>
            <span>{state.statusMessage}</span>
          </div>
          <h1 className="text-[18px] font-bold tracking-tighter leading-none uppercase">Shuffle Draft</h1>
        </div>
        <div className="flex items-center gap-3">
          {state.config.pickTimer && state.timerSecondsLeft != null ? (
            <div className="w-[120px] h-[2px] bg-[var(--color-border)] rounded-none overflow-hidden">
              <Progress value={(state.timerSecondsLeft / state.config.pickTimer) * 100} className="h-full bg-[var(--color-accent)]" />
            </div>
          ) : null}
          <Badge variant="outline" className="number-mono text-[8px]">{humanDrafted.length}/{GAME.XI_SIZE}</Badge>
        </div>
      </header>

      <main className="flex-1 min-w-0 overflow-y-auto p-3 lg:p-4">
        {holdSet ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={boardVariants}
            className="mb-4"
          >
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-ink-dim)] block mb-3">Your set — pick one player</span>
            <Board set={holdSet} onPick={handlePick} disabled={false} />
          </motion.div>
        ) : (
          <div className="px-4 py-20 text-center">
            <span className="text-[10px] text-[var(--color-ink-dim)] uppercase tracking-wider">Your set</span>
            <p className="mt-2 text-[var(--color-ink-dim)] uppercase tracking-wider text-[9px]">No set available this round.</p>
          </div>
        )}
      </main>

      <aside className={cn(
        "border-t border-[var(--color-border)] bg-[var(--color-surface)]",
        "lg:border-t-0 lg:border-l lg:border-[var(--color-border)] lg:w-[340px] lg:shadow-none",
      )}>
        <div className="p-3 lg:p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Your XI (drafted)</h3>
              <p className="text-[8px] text-[var(--color-ink-dim)] uppercase tracking-wider">Provisional {provisional}</p>
            </div>
            <Button
              onClick={() => setXiExpanded(!xiExpanded)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[8px]"
            >
              {xiExpanded ? "Collapse" : "View XI"}
            </Button>
          </div>

          {xiExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                {humanDrafted.length === 0 ? (
                  <div className="text-center py-4 text-[8px] text-[var(--color-ink-dim)] uppercase tracking-wider italic">No players drafted yet.</div>
                ) : (
                  <div className="space-y-2">
                    {humanDrafted.map((d) => (
                      <motion.div
                        key={d.player.id}
                        initial="hidden"
                        animate="visible"
                        exit={cardVariants.exit}
                        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--color-border)]/20"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-[8px] font-mono leading-none">{d.player.nation}</span>
                          <span className="text-xs font-bold truncate uppercase">{d.player.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn("inline-block px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase", posColor(d.player.position))}>
                            {d.player.position}
                          </span>
                          <span className="number-mono text-[8px] font-bold">{d.player.rating}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </aside>
    </div>
  );
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "DEF": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "MID": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "FWD": return "border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)]";
  }
  return "border border-[var(--color-border)] text-[var(--color-ink-dim)]";
}
