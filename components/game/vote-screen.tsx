"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster as Sonner } from "sonner";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS, GAME } from "@/lib/config";
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
      <header className="px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] uppercase tracking-wider mb-2">
          <span>·</span>
          <span>Secret vote — pick the best XI (not your own)</span>
        </div>
        <h2 className="text-lg font-bold">Vote</h2>
      </header>

      <div className="p-5 lg:p-8 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            return (
              <Card key={m.id} className={cn("border-transparent hover:border-black/30", voted ? "border-[var(--color-pale-yellow-text)]/30 bg-[var(--color-pale-yellow-bg)]" : "")} onClick={() => !hasVoted && handleVote(m.id)} role="button" tabIndex={0}>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{m.displayName}</CardTitle>
                    {voted && <span className="text-[10px] font-mono text-[var(--color-pale-yellow-text)]">Your vote</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs">
                    {formation && <span className="font-mono">{formation.name}</span>}
                    <span className="text-[var(--color-muted-soft)]">·</span>
                    <span className="font-mono text-[var(--color-muted)]">{state.teamRatings[m.id]?.toFixed(1) ?? "—"}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[200px]">
                    <Pitch
                      slots={formation?.slots ?? []}
                      fills={fillsBySlot}
                      onPlace={() => {}}
                      editable={false}
                    />
                  </div>
                  <div className="mt-2 text-[10px] text-[var(--color-muted)]">Chemistry +{comp?.chemistry ?? 0}</div>
                </CardContent>
                <CardDescription className="p-3 text-[10px] text-center">
                  {hasVoted ? (voted ? "Your vote" : "Voted") : "Tap to vote"}
                </CardDescription>
              </Card>
            );
          })}
        </div>

        {!hasVoted && (
          <div className="mt-5 text-center text-[var(--color-muted)] text-xs italic">
            Your vote is secret until the reveal.
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span>Locked in:</span>
          {state.members.map((m) => (
            <span key={m.id} className={cn("flex items-center gap-1", state.lineups[m.id]?.locked ? "text-[var(--color-pale-green-text)]" : "text-[var(--color-muted)]")}>
              {m.displayName}{state.lineups[m.id]?.locked ? " <span className='text-[10px]'>•</span>" : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
