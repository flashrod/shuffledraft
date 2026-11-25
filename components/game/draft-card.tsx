"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

export interface DraftCardProps {
  player: Player;
  selected: boolean;
  onSelect: (player: Player) => void;
  inSet?: boolean;
  positionTally?: { GK: number; DEF: number; MID: number; FWD: number };
}

function tierColor(rating: number) {
  if (rating >= 90) return "text-[var(--color-pale-yellow-text)]";
  if (rating >= 80) return "text-[var(--color-pale-green-text)]";
  if (rating >= 70) return "text-[var(--color-pale-blue-text)]";
  if (rating >= 60) return "text-[var(--color-muted)]";
  return "text-[var(--color-pale-red-text)]";
}

function tierBg(rating: number) {
  if (rating >= 90) return "bg-[var(--color-pale-yellow-bg)]";
  if (rating >= 80) return "bg-[var(--color-pale-green-bg)]";
  if (rating >= 70) return "bg-[var(--color-pale-blue-bg)]";
  if (rating >= 60) return "bg-[#f5f5f2]";
  return "bg-[var(--color-pale-red-bg)]";
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "bg-[var(--color-pale-blue-bg)] text-[var(--color-pale-blue-text)] border-[var(--color-pale-blue-text)]/20";
    case "DEF": return "bg-[var(--color-pale-green-bg)] text-[var(--color-pale-green-text)] border-[var(--color-pale-green-text)]/20";
    case "MID": return "bg-[var(--color-pale-yellow-bg)] text-[var(--color-pale-yellow-text)] border-[var(--color-pale-yellow-text)]/20";
    case "FWD": return "bg-[var(--color-pale-red-bg)] text-[var(--color-pale-red-text)] border-[var(--color-pale-red-text)]/20";
  }
  return "border-[var(--color-border)] text-[var(--color-muted)]";
}

export function DraftCard({ player, selected, onSelect, inSet = true, positionTally }: DraftCardProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer border transition-all duration-200 hover:border-black/40",
        selected ? "border-yellow-400/60 bg-yellow-500/10" : "border-transparent hover:bg-white/50",
        inSet ? "" : "opacity-50 grayscale",
      )}
      onClick={() => onSelect(player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(player);
        }
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--color-muted)]">{player.nation}</span>
          <CardTitle className="text-sm font-semibold truncate">{player.name}</CardTitle>
        </div>
        <Badge variant="outline" className={cn("text-[9px]", posColor(player.position))}>
          {player.position}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className={cn("font-bold", tierColor(player.rating))}>{player.rating}</div>
          <div className="text-[10px] text-[var(--color-muted)] truncate max-w-[70px]">{player.club ?? "—"}</div>
        </div>
        {positionTally && (
          <div className="flex gap-2 mt-2 text-[10px] text-[var(--color-muted-soft)]">
            <span className="flex items-center gap-1">GK <b>{positionTally.GK}</b></span>
            <span className="flex items-center gap-1">DEF <b>{positionTally.DEF}</b></span>
            <span className="flex items-center gap-1">MID <b>{positionTally.MID}</b></span>
            <span className="flex items-center gap-1">FWD <b>{positionTally.FWD}</b></span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
