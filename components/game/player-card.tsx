"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game";

function tierColor(rating: number) {
  if (rating >= 90) return "text-[var(--color-accent)]";
  if (rating >= 80) return "text-[var(--color-terminal-green)]";
  if (rating >= 70) return "text-[var(--color-ink)]";
  if (rating >= 60) return "text-[var(--color-ink-dim)]";
  return "text-[var(--color-accent)]";
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "border border-[var(--color-ink)] bg-[var(--color-ink)]/5 text-[var(--color-ink)]";
    case "DEF": return "border border-[var(--color-ink)] bg-[var(--color-ink)]/5 text-[var(--color-ink)]";
    case "MID": return "border border-[var(--color-ink)] bg-[var(--color-ink)]/5 text-[var(--color-ink)]";
    case "FWD": return "border border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)]";
  }
  return "border border-[var(--color-border)] text-[var(--color-ink-dim)]";
}

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onSelect?: (player: Player) => void;
  tier?: "drafted" | "available";
  isAvailable?: boolean;
  takenBy?: string;
  square?: boolean;
}

export function PlayerCard({ player, selected = false, onSelect, tier = "available", isAvailable = true, takenBy, square = false }: PlayerCardProps) {
  const isDrafted = tier === "drafted";
  const taken = !isAvailable;

  const cardSize = square ? "w-[110px] h-[110px]" : "min-h-[150px]";

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-surface)] group flex flex-col items-center justify-center",
        cardSize,
        taken ? "border border-[var(--color-border)]/30 bg-[var(--color-ink-dim)]/5 grayscale" :
          selected ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-transparent hover:border-[var(--color-ink)] hover:bg-[var(--color-surface)]/30",
        isDrafted ? "opacity-50 grayscale" : "",
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
      <div className="px-2 pt-2 pb-1 w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={cn("inline-block px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase", taken ? "border border-[var(--color-ink-dim)] bg-transparent text-[var(--color-ink-dim)]" : posColor(player.position))}>
            {player.position}
          </span>
          <span className="text-[9px] font-mono leading-none">{player.nation}</span>
        </div>
        <h3 className="text-[11px] font-bold leading-tight tracking-tight truncate uppercase text-center">{player.name}</h3>
      </div>
      <div className="px-2 pb-2 border-t border-[var(--color-border)]/40 w-full">
        <div className="flex items-center justify-center gap-1">
          <span className={cn("number-mono text-2xl font-bold", tierColor(player.rating))}>
            {player.rating}
          </span>
        </div>
      </div>
      {taken && takenBy && pickerNameBadge(takenBy)}
      {selected && !taken && (
        <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-none bg-[var(--color-accent)] text-[var(--color-bg)]">
          <span className="text-[8px] font-bold leading-none">•</span>
        </div>
      )}
    </motion.div>
  );
}

function pickerNameBadge(name: string) {
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center px-1.5 py-0.5 bg-[var(--color-accent)] text-[var(--color-bg)] rounded-none">
      <span className="text-[7px] font-bold uppercase tracking-wider">{name}</span>
    </div>
  );
}
