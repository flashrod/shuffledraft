"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

function tierColor(rating: number) {
  if (rating >= 90) return "text-[var(--color-pale-yellow-text)]";
  if (rating >= 80) return "text-[var(--color-pale-green-text)]";
  if (rating >= 70) return "text-[var(--color-pale-blue-text)]";
  if (rating >= 60) return "text-[var(--color-muted)]";
  return "text-[var(--color-pale-red-text)]";
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

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onSelect?: (player: Player) => void;
  tier?: "drafted" | "available";
}

export function PlayerCard({ player, selected = false, onSelect, tier = "available" }: PlayerCardProps) {
  const isDrafted = tier === "drafted";

  return (
    <div
      className={cn(
        "player-card group",
        selected ? "selected" : "border-transparent hover:border-black/30",
        isDrafted ? "opacity-60 grayscale" : "",
      )}
      onClick={() => onSelect?.(player)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Draft ${player.name}, ${player.rating}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(player);
        }
      }}
    >
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-mono leading-none">{player.nation}</span>
          <span className={cn("inline-block px-1.5 py-0.5 rounded text-[8px] font-bold leading-none", posColor(player.position))}>
            {player.position}
          </span>
        </div>
        <h3 className="mt-1 text-sm font-semibold leading-tight tracking-tight">{player.name}</h3>
      </div>
      <div className="px-3 pb-2.5 border-t border-[var(--color-border)]/40">
        <div className="flex items-end justify-between gap-2">
          <span className={cn("number-mono text-xl font-bold", tierColor(player.rating))}>
            {player.rating}
          </span>
          <span className="text-[10px] text-[var(--color-muted-soft)] truncate max-w-[60%]">
            {player.club ?? "—"}
          </span>
        </div>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-pale-yellow-text)] text-white">
          <span className="text-[9px] font-bold leading-none">•</span>
        </div>
      )}
    </div>
  );
}
