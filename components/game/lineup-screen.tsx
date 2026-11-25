"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast, Toaster as Sonner } from "sonner";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS, GAME } from "@/lib/config";
import { Pitch } from "@/components/game/pitch";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

const POSITION_LABEL: Record<string, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

export function LineupScreen({ state, dispatch }: { state: EngineState; dispatch: React.Dispatch<EngineAction> }) {
  const human = state.members[0];
  const drafted = state.drafted[human.id] ?? [];
  const lineup = state.lineups[human.id];
  const comp = state.lineupComputations[human.id];

  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const allLocked = state.members.every((m) => state.lineups[m.id]?.locked);

  const handleSelectFormation = (id: string | null) => {
    if (!id) return;
    dispatch({ type: "LINEUP_SELECT_FORMATION", memberId: human.id, formationId: id });
    setSelectedPlayerId(null);
  };

  const handleTapSlot = (slotIndex: number, playerId: string | null) => {
    if (lineup?.locked || allLocked) return;
    const occupant = (lineup?.slots.find((s) => s.slotIndex === slotIndex)?.playerId) ?? null;
    if (selectedPlayerId) {
      dispatch({ type: "LINEUP_PLACE", memberId: human.id, slotIndex, playerId: selectedPlayerId });
      setSelectedPlayerId(null);
    } else if (occupant) {
      dispatch({ type: "LINEUP_PLACE", memberId: human.id, slotIndex, playerId: null });
      setSelectedPlayerId(occupant);
    }
  };

  const handleAutoArrange = () => {
    if (!lineup?.formationId) return;
    dispatch({ type: "LINEUP_AUTO", memberId: human.id });
    setSelectedPlayerId(null);
  };

  const handleSuggest = () => {
    dispatch({ type: "LINEUP_SUGGEST", memberId: human.id });
    setSelectedPlayerId(null);
  };

  const canLock = !!lineup?.formationId && lineup.slots.length === 11;

  const draftedMap = new Map(drafted.map((d) => [d.player.id, d.player]));
  const fillsBySlot: Record<number, { id: string; name: string; position: string; rating: number } | null> = {};
  const crossLine: Record<number, boolean> = {};
  const effRating: Record<number, number> = {};
  if (lineup) {
    for (const sl of lineup.slots) {
      fillsBySlot[sl.slotIndex] = draftedMap.get(sl.playerId) ?? null;
    }
    if (comp) {
      for (const sl of comp.slots) {
        crossLine[sl.slotIndex] = sl.penalty > 0;
        effRating[sl.slotIndex] = sl.effectiveRating;
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Sonner />
      <header className="flex flex-col lg:flex-row justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-10">
        <div>
          <div className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Lineup phase</div>
          <h2 className="text-lg font-bold">Arrange your XI</h2>
        </div>
        <div className="flex items-end gap-3">
          {state.config.lineupTimer && state.timerSecondsLeft != null ? (
            <div className="w-32">
              <Progress value={(state.timerSecondsLeft / state.config.lineupTimer!) * 100} />
            </div>
          ) : null}
          <Badge variant="outline">{lineup?.slots.length ?? 0}/11</Badge>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-5 lg:p-8 gap-6">
        <div className="lg:w-[340px] flex-shrink-0 space-y-4">
          <Card className="border-transparent hover:border-black/30">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Drafted players</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {drafted.map((d) => {
                  const placed = lineup?.slots.some((s) => s.playerId === d.player.id);
                  return (
                    <div
                      key={d.player.id}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-sm border cursor-pointer transition-colors",
                        selectedPlayerId === d.player.id
                          ? "border-black/40 bg-[#f5f5f2]"
                          : placed
                            ? "border-[var(--color-pale-green-text)]/20 bg-[var(--color-pale-green-bg)]"
                            : "border-transparent hover:bg-white/50",
                      )}
                      onClick={() => setSelectedPlayerId(selectedPlayerId === d.player.id ? null : d.player.id)}
                    >
                      {placed ? (
                        <span className="text-[10px] font-bold text-[var(--color-pale-green-text)]">•</span>
                      ) : (
                        <span className="text-[11px]">{d.player.nation}</span>
                      )}
                      <span className="text-xs truncate flex-1">{d.player.name}</span>
                      <Badge variant="outline" className="text-[9px]">{d.player.position}</Badge>
                      <span className="text-[11px] font-mono text-[var(--color-muted)]">{d.player.rating}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Button onClick={handleAutoArrange} disabled={!lineup?.formationId} className="w-full text-sm">
              Auto-arrange
            </Button>
            <Button onClick={handleSuggest} variant="outline" className="w-full text-sm">
              Suggest best formation
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <Card className="border-transparent hover:border-black/30">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Formation</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <Select onValueChange={handleSelectFormation} defaultValue={lineup?.formationId ?? null}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={lineup?.formationId ? FORMATIONS.find((f) => f.id === lineup.formationId)!.name : "Choose formation"} />
                </SelectTrigger>
                <SelectContent>
                  {FORMATIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="mt-4 flex-1">
            <Pitch
              slots={lineup?.formationId ? FORMATIONS.find((f) => f.id === lineup.formationId)!.slots : []}
              fills={fillsBySlot}
              onPlace={handleTapSlot}
              onRemove={(slotIndex) => {
                if (lineup?.locked || allLocked) return;
                dispatch({ type: "LINEUP_PLACE", memberId: human.id, slotIndex, playerId: null });
                setSelectedPlayerId(null);
              }}
              editable={!lineup?.locked && !allLocked}
              crossLineBySlot={crossLine}
              effectiveRatingBySlot={effRating}
            />
          </div>
          <div className="mt-2 text-center text-xs text-[var(--color-muted)]">
            Tap a player, then tap a slot to place. Tap an occupied slot to lift/swap.
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Team rating</div>
            <div className="text-2xl font-bold">{comp ? comp.teamRating.toFixed(1) : "—"}</div>
            <div className="text-xs text-[var(--color-muted)]">Chemistry +{comp?.chemistry ?? 0}</div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => dispatch({ type: "LINEUP_LOCK", memberId: human.id })}
              disabled={!canLock || lineup?.locked || allLocked}
              className={cn(
                "w-full lg:w-auto flex-1",
                canLock && !lineup?.locked && !allLocked
                  ? "bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)]"
                  : "bg-transparent border-[var(--color-border)] text-[var(--color-muted)] cursor-not-allowed",
              )}
            >
              {lineup?.locked ? "Locked in" : "Lock in XI"}
            </Button>
            {lineup?.locked && !allLocked && (
              <Button variant="outline" onClick={() => dispatch({ type: "LINEUP_UNLOCK", memberId: human.id })}>
                Unlock
              </Button>
            )}
          </div>
        </div>
      </div>

      {allLocked && (
        <div className="p-5 text-center text-xs text-[var(--color-muted)]">All managers locked in — voting begins.</div>
      )}
    </div>
  );
}
