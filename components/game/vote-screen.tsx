"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster as Sonner } from "sonner";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS } from "@/lib/config";
import { Pitch } from "@/components/game/pitch";
import { cn } from "@/lib/utils";

export function VoteScreen({
  state,
  dispatch,
  onVote,
}: {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  onVote?: (teamMemberId: string) => void;
}) {
  const human = state.members[0];
  const others = state.members.filter((m) => m.id !== human.id);

  const hasVoted = !!state.votes[human.id];

  const handleVote = (teamMemberId: string) => {
    if (hasVoted) return;
    dispatch({ type: "VOTE", voterMemberId: human.id, teamMemberId });
    onVote?.(teamMemberId);
    toast("Vote cast");
  };

  return (
    <div className="flex flex-col h-full">
      <Sonner />
      <header className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-dim)] uppercase tracking-wider mb-2">
          <span>·</span>
          <span>Secret vote — pick the best XI (not your own)</span>
        </div>
        <h1 className="text-[22px] font-bold tracking-tighter leading-none uppercase">Vote</h1>
      </header>

      <div className="p-4 lg:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[var(--color-border)]">
          {others.map((m) => {
            const lineup = state.lineups[m.id];
            const comp = state.lineupComputations[m.id];
            const formation = lineup?.formationId ? FORMATIONS.find((f) => f.id === lineup.formationId) : null;
            const voted = state.votes[human.id] === m.id;
            const drafted = state.drafted[m.id] ?? [];
            const draftedMap = new Map(drafted.map((d) => [d.player.id, d.player]));
            const fillsBySlot: Record<number, { id: string; name: string; position: string; rating: number } | null> = {};
            if (lineup) {
              for (const sl of lineup.slots) {
                fillsBySlot[sl.slotIndex] = draftedMap.get(sl.playerId) ?? null;
              }
            }
            const rating = state.teamRatings[m.id] ?? 0;
            return (
              <div
                key={m.id}
                className={cn(
                  "border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors",
                  voted
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-[4px_4px_0px_var(--color-accent)]"
                    : "border-transparent hover:border-[var(--color-ink)] hover:bg-white/50",
                )}
                onClick={() => !hasVoted && handleVote(m.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleVote(m.id);
                  }
                }}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold uppercase">{m.displayName}</span>
                    {voted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-bold uppercase text-[var(--color-bg)] bg-[var(--color-accent)] border border-[var(--color-accent)]">
                        <span className="text-[8px]">•</span> Your vote
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px]">
                    {formation && (
                      <span className="font-mono opacity-70">{formation.name}</span>
                    )}
                    <span className="w-px h-3 bg-[var(--color-border-bright)]"></span>
                    <span className="number-mono text-[var(--color-ink-dim)]">{rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="h-[180px] flex items-center justify-center p-2">
                  <Pitch
                    slots={formation?.slots ?? []}
                    fills={fillsBySlot}
                    onPlace={() => {}}
                    editable={false}
                  />
                </div>
                <div className="p-3 text-center">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-wider",
                    hasVoted ? "text-[var(--color-ink-dim)]" : "text-[var(--color-ink-dim)]",
                  )}>
                    {hasVoted ? (voted ? "Your vote" : "Voted") : "Tap to vote"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {!hasVoted && (
          <div className="mt-5 text-center text-[9px] text-[var(--color-ink-dim)] uppercase tracking-wider italic">
            Your vote is secret until the reveal.
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 text-[9px] text-[var(--color-ink-dim)] uppercase tracking-wider">
          <span>Locked in:</span>
          {state.members.map((m) => (
            <span key={m.id} className={cn("flex items-center gap-1.5", state.lineups[m.id]?.locked ? "text-[var(--color-terminal-green)]" : "text-[var(--color-ink-dim)]")}>
              {m.displayName}
              {state.lineups[m.id]?.locked && (
                <span className="w-1.5 h-1.5 rounded-none bg-[var(--color-terminal-green)]"></span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
