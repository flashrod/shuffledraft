"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster as Sonner } from "sonner";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS } from "@/lib/config";
import { Pitch } from "@/components/game/pitch";
import { cn } from "@/lib/utils";

export function VoteScreen({ state, dispatch }: { state: EngineState; dispatch: React.Dispatch<EngineAction> }) {
  const human = state.members[0];
  const others = state.members.filter((m) => m.id !== human.id);

  const hasVoted = !!state.votes[human.id];

  const handleVote = (teamMemberId: string) => {
    if (hasVoted) return;
    dispatch({ type: "VOTE", voterMemberId: human.id, teamMemberId });
    toast("Vote cast");
  };

  return (
    <div className="flex flex-col h-full">
      <Sonner />
      <header className="px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] uppercase tracking-[0.14em] mb-2">
          <span>·</span>
          <span>Secret vote — pick the best XI (not your own)</span>
        </div>
        <h2 className="text-lg font-bold">Vote</h2>
      </header>

      <div className="p-4 lg:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  "rounded-[14px] border bg-white shadow-sm transition-all duration-200",
                  voted
                    ? "border-[var(--color-pale-yellow-text)]/30 bg-[var(--color-pale-yellow-bg)]/40 shadow-[0_0_0_1px_rgba(149,100,0,0.15)]"
                    : "border-[var(--color-border)]/40 hover:border-black/40 hover:shadow-md",
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
                    <span className="text-sm font-semibold">{m.displayName}</span>
                    {voted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold text-[var(--color-pale-yellow-text)] bg-[var(--color-pale-yellow-bg)]/60 border-[var(--color-pale-yellow-text)]/20">
                        <span className="text-[8px]">•</span> Your vote
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px]">
                    {formation && (
                      <span className="font-mono opacity-70">{formation.name}</span>
                    )}
                    <span className="w-px h-3 bg-[var(--color-border-strong)]"></span>
                    <span className="number-mono text-[var(--color-muted-soft)]">{rating.toFixed(1)}</span>
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
                    "text-xs font-medium",
                    hasVoted ? "text-[var(--color-muted)]" : "text-[var(--color-ink-soft)]",
                  )}>
                    {hasVoted ? (voted ? "Your vote" : "Voted") : "Tap to vote"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {!hasVoted && (
          <div className="mt-5 text-center text-xs text-[var(--color-muted)] italic">
            Your vote is secret until the reveal.
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 text-xs text-[var(--color-muted)]">
          <span>Locked in:</span>
          {state.members.map((m) => (
            <span key={m.id} className={cn("flex items-center gap-1.5", state.lineups[m.id]?.locked ? "text-[var(--color-pale-green-text)]" : "text-[var(--color-muted)]")}>
              {m.displayName}
              {state.lineups[m.id]?.locked && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-pale-green-text)]"></span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
