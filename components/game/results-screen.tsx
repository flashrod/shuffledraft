"use client";

import * as React from "react";
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
      <header className="px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-10">
        <h2 className="text-lg font-bold flex items-center gap-2">Results</h2>
      </header>

      <div className="p-5 lg:p-8 overflow-y-auto">
        {voteResults && (
          <div className="mb-7 p-5 rounded-sm border border-[var(--color-pale-yellow-text)]/20 bg-[var(--color-pale-yellow-bg)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">·</span>
              <span className="font-bold">Winner:{" "}
                {voteResults.winner
                  ? state.members.find((m) => m.id === voteResults.winner)?.displayName
                  : "Tie"}</span>
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              {voteResults.ties.length > 1
                ? `Tie between ${voteResults.ties.map((t) => state.members.find((m) => m.id === t)?.displayName).join(", ")}`
                : `Most votes (tie broken by team rating)`}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Card key={m.id} className="border-transparent hover:border-black/30">
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--color-muted)]">#{i + 1}</span>
                      <CardTitle className="text-sm font-semibold">{m.displayName}</CardTitle>
                    </div>
                    <Badge>{rating.toFixed(1)}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs">
                    {formation && <span className="font-mono">{formation.name}</span>}
                    <span className="text-[var(--color-muted-soft)]">·</span>
                    <span className="font-mono text-[var(--color-muted)]">{votesReceived} vote{votesReceived !== 1 ? "s" : ""}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="h-[220px]">
                    <Pitch slots={formation?.slots ?? []} fills={fillsBySlot} onPlace={() => {}} editable={false} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex items-center gap-2">
          <Button onClick={copySquads} className="w-full lg:w-auto flex-1 bg-white/50 border-[var(--color-border)] hover:bg-white text-[var(--color-ink)]">
            Copy squads
          </Button>
          <Button variant="outline" className="flex-1 border-[var(--color-border)] hover:bg-white/50 text-[var(--color-ink-soft)]">
            Play again
          </Button>
        </div>
      </div>
    </div>
  );
}
