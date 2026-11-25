"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster as Sonner } from "sonner";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS } from "@/lib/config";
import { Pitch } from "@/components/game/pitch";
import { cn } from "@/lib/utils";

export function ResultsScreen({ state, dispatch }: { state: EngineState; dispatch: React.Dispatch<EngineAction> }) {
  const ranked = [...state.members].sort(
    (a, b) => (state.teamRatings[b.id] ?? 0) - (state.teamRatings[a.id] ?? 0),
  );
  const voteResults = state.voteResults;

  const copySquads = () => {
    const lines: string[] = [];
    for (const m of ranked) {
      const lineup = state.lineups[m.id];
      const formation = lineup?.formationId ? FORMATIONS.find((f) => f.id === lineup.formationId) : null;
      const rating = state.teamRatings[m.id] ?? 0;
      lines.push(`#${ranked.indexOf(m) + 1} ${m.displayName} — ${formation?.name ?? "—"} (${rating.toFixed(1)})`);
      const drafted = state.drafted[m.id] ?? [];
      const draftedMap = new Map(drafted.map((d) => [d.player.id, d.player]));
      if (lineup) {
        for (const sl of lineup.slots) {
          const p = draftedMap.get(sl.playerId);
          if (p) lines.push(`   ${sl.slotIndex + 1}. ${p.name} (${p.position}, ${p.rating})`);
        }
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast("Squads copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full">
      <Sonner />
      <header className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
        <h1 className="text-[18px] font-bold tracking-tighter leading-none uppercase flex items-center gap-2">Results</h1>
      </header>

      <div className="p-3 lg:p-4 overflow-y-auto">
        {voteResults && (
          <div className="mb-7 p-4 border border-[var(--color-accent)] bg-[var(--color-accent)]/10 shadow-[4px_4px_0px_var(--color-accent)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px]">·</span>
              <span className="font-bold uppercase">Winner:{" "}
                {voteResults.winner
                  ? state.members.find((m) => m.id === voteResults.winner)?.displayName
                  : "Tie"}</span>
            </div>
            <div className="text-[8px] text-[var(--color-ink-dim)] uppercase tracking-wider">
              {voteResults.ties.length > 1
                ? `Tie between ${voteResults.ties.map((t) => state.members.find((m) => m.id === t)?.displayName).join(", ")}`
                : `Most votes (tie broken by team rating)`}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[var(--color-border)]">
          {ranked.map((m, i) => {
            const lineup = state.lineups[m.id];
            const formation = lineup?.formationId ? FORMATIONS.find((f) => f.id === lineup.formationId) : null;
            const rating = state.teamRatings[m.id] ?? 0;
            const votesReceived = voteResults?.results.find((r: any) => r.teamMemberId === m.id)?.votes ?? 0;
            const drafted = state.drafted[m.id] ?? [];
            const draftedMap = new Map(drafted.map((d) => [d.player.id, d.player]));
            const fillsBySlot: Record<number, { id: string; name: string; position: string; rating: number } | null> = {};
            if (lineup) {
              for (const sl of lineup.slots) {
                fillsBySlot[sl.slotIndex] = draftedMap.get(sl.playerId) ?? null;
              }
            }
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ transitionDelay: `${i * 0.1}s` }}
                className="border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <CardHeader className="p-4 border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--color-ink-dim)]">#{i + 1}</span>
                      <CardTitle className="text-sm font-bold uppercase">{m.displayName}</CardTitle>
                    </div>
                    <Badge>{rating.toFixed(1)}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-[9px]">
                    {formation && <span className="font-mono">{formation.name}</span>}
                    <span className="w-px h-3 bg-[var(--color-border-bright)]"></span>
                    <span className="number-mono text-[var(--color-ink-dim)]">{votesReceived} vote{votesReceived !== 1 ? "s" : ""}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[200px]">
                    <Pitch slots={formation?.slots ?? []} fills={fillsBySlot} onPlace={() => {}} editable={false} />
                  </div>
                </CardContent>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2">
          <Button onClick={copySquads} className="w-full lg:w-auto flex-1 bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-white/50 text-[var(--color-ink)] text-[9px] font-bold uppercase tracking-wider">
            Copy squads
          </Button>
          <Button variant="outline" className="flex-1 border-[var(--color-border)] hover:bg-white/50 text-[var(--color-ink-dim)] text-[9px] font-bold uppercase tracking-wider">
            Play again
          </Button>
        </div>
      </div>
    </div>
  );
}
