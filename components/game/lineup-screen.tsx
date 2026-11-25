"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toaster as Sonner } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type EngineState, type EngineAction } from "@/lib/game/engine";
import { FORMATIONS } from "@/lib/config";
import { Pitch } from "@/components/game/pitch";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

const POSITION_LABEL: Record<string, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" };

export function LineupScreen({
  state,
  dispatch,
  onSelectFormation,
  onPlace,
  onAutoArrange,
  onSuggest,
  onLockLineup,
}: {
  state: EngineState;
  dispatch: React.Dispatch<EngineAction>;
  onSelectFormation?: (id: string) => void;
  onPlace?: (slotIndex: number, playerId: string | null) => void;
  onAutoArrange?: () => void;
  onSuggest?: () => void;
  onLockLineup?: () => void;
}) {
  const human = state.members[0];
  const drafted = state.drafted[human.id] ?? [];
  const lineup = state.lineups[human.id];
  const comp = state.lineupComputations[human.id];

  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const allLocked = state.members.every((m) => state.lineups[m.id]?.locked);

  const handleSelectFormation = (id: string | null) => {
    if (!id) return;
    dispatch({ type: "LINEUP_SELECT_FORMATION", memberId: human.id, formationId: id });
    onSelectFormation?.(id);
    setSelectedPlayerId(null);
  };

  const handleTapSlot = (slotIndex: number, playerId: string | null) => {
    if (lineup?.locked || allLocked) return;
    const occupant = (lineup?.slots.find((s) => s.slotIndex === slotIndex)?.playerId) ?? null;
    if (selectedPlayerId) {
      dispatch({ type: "LINEUP_PLACE", memberId: human.id, slotIndex, playerId: selectedPlayerId });
      onPlace?.(slotIndex, selectedPlayerId);
      setSelectedPlayerId(null);
    } else if (occupant) {
      dispatch({ type: "LINEUP_PLACE", memberId: human.id, slotIndex, playerId: null });
      onPlace?.(slotIndex, null);
      setSelectedPlayerId(occupant);
    }
  };

  const handleAutoArrange = () => {
    if (!lineup?.formationId) return;
    dispatch({ type: "LINEUP_AUTO", memberId: human.id });
    onAutoArrange?.();
    setSelectedPlayerId(null);
  };

  const handleSuggest = () => {
    dispatch({ type: "LINEUP_SUGGEST", memberId: human.id });
    onSuggest?.();
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
      <header className="flex flex-col lg:flex-row justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-white sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] uppercase tracking-[0.14em]">
            <span>·</span>
            <span>Lineup phase</span>
          </div>
          <h2 className="text-lg font-bold">Arrange your XI</h2>
        </div>
        <div className="flex items-end gap-4">
          {state.config.lineupTimer && state.timerSecondsLeft != null ? (
            <div className="w-[140px] h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <Progress value={(state.timerSecondsLeft / state.config.lineupTimer!) * 100} className="h-full bg-[var(--color-pale-yellow-text)]" />
            </div>
          ) : null}
          <Badge variant="outline" className="number-mono text-sm">
            {lineup?.slots.length ?? 0}/11
          </Badge>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-4 lg:p-6 gap-6">
        {/* Left: drafted players as tappable cards */}
        <div className="lg:w-[340px] flex-shrink-0 space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-muted-soft)] block mb-3">Drafted players</span>
            <div className="space-y-1.5">
              {drafted.map((d) => {
                const placed = lineup?.slots.some((s) => s.playerId === d.player.id);
                return (
                  <div
                    key={d.player.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-[12px] border cursor-pointer transition-colors",
                      selectedPlayerId === d.player.id
                        ? "border-black/40 bg-[#f5f5f2]"
                        : placed
                          ? "border-[var(--color-pale-green-text)]/20 bg-[var(--color-pale-green-bg)]/50"
                          : "border-transparent hover:bg-white hover:border-[var(--color-border)]/40",
                    )}
                    onClick={() => setSelectedPlayerId(selectedPlayerId === d.player.id ? null : d.player.id)}
                  >
                    {placed ? (
                      <span className="text-[10px] font-bold text-[var(--color-pale-green-text)]">•</span>
                    ) : (
                      <span className="text-[11px]">{d.player.nation}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{d.player.name}</span>
                        <span className="number-mono text-xs font-bold text-[var(--color-muted)]">{d.player.rating}</span>
                      </div>
                      <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-bold leading-none", posColor(d.player.position))}>
                        {d.player.position}
                      </span>
                    </div>
                  </div>
                );
              })}
              {drafted.length === 0 && (
                <div className="text-center py-6 text-sm text-[var(--color-muted)] italic">No players drafted yet.</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={handleAutoArrange} disabled={!lineup?.formationId} className="w-full text-sm">
              Auto-arrange
            </Button>
            <Button onClick={handleSuggest} variant="outline" className="w-full text-sm">
              Suggest best formation
            </Button>
          </div>
        </div>

        {/* Right: formation + pitch */}
        <div className="flex-1 min-w-0 space-y-5">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-muted-soft)] block mb-3">Formation</span>
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
          </div>

          <div className="flex-1">
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
          <p className="text-center text-xs text-[var(--color-muted)] italic">
            Tap a player, then tap a slot to place. Tap an occupied slot to lift/swap.
          </p>
        </div>

        {/* Bottom bar: rating + lock */}
        <div className="mt-4 border-t border-[var(--color-border)] pt-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <div className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em]">Team rating</div>
            <div className="text-2xl font-bold number-mono">{comp ? comp.teamRating.toFixed(1) : "—"}</div>
            <div className="text-xs text-[var(--color-muted)]">Chemistry +{comp?.chemistry ?? 0}</div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                dispatch({ type: "LINEUP_LOCK", memberId: human.id });
                onLockLineup?.();
              }}
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
        <div className="p-4 text-center text-xs text-[var(--color-muted)]">All managers locked in — voting begins.</div>
      )}
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
