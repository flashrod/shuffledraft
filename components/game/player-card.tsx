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
    case "GK": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "DEF": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "MID": return "border border-[var(--color-ink)] bg-transparent text-[var(--color-ink)]";
    case "FWD": return "border border-[var(--color-accent)] bg-transparent text-[var(--color-accent)]";
  }
  return "border border-[var(--color-border)] text-[var(--color-ink-dim)]";
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
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "border border-[var(--color-border)] bg-[var(--color-surface)] group",
        selected ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10" : "border-transparent hover:border-[var(--color-ink)] hover:bg-white/50",
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
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn("inline-block px-1.5 py-0.5 rounded-none text-[8px] font-bold uppercase", posColor(player.position))}>
            {player.position}
          </span>
          <span className="text-[9px] font-mono leading-none">{player.nation}</span>
        </div>
        <h3 className="text-sm font-bold leading-tight tracking-tight truncate uppercase">{player.name}</h3>
      </div>
      <div className="px-3 pb-2 border-t border-[var(--color-border)]/40">
        <div className="flex items-end justify-between gap-1">
          <span className={cn("number-mono text-xl font-bold", tierColor(player.rating))}>
            {player.rating}
          </span>
          <span className="text-[10px] text-[var(--color-ink-dim)] truncate max-w-[55%] uppercase">{player.club ?? "—"}</span>
        </div>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-none bg-[var(--color-accent)] text-[var(--color-bg)]">
          <span className="text-[9px] font-bold leading-none">•</span>
        </div>
      )}
    </motion.div>
  );
}
