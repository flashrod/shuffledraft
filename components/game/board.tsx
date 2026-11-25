"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PlayerCard } from "@/components/game/player-card";
import type { Player } from "@/lib/game";

interface BoardProps {
  set: { index: number; players: Player[] } | null;
  onPick: (player: Player) => void;
  disabled?: boolean;
}

export function Board({ set, onPick, disabled = false }: BoardProps) {
  const players = set?.players ?? [];

  return (
    <div className="compartment rounded-none p-[1px]">
      {players.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[1px] bg-[var(--color-border)]">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              selected={false}
              onSelect={(sel) => {
                if (!disabled) onPick(sel);
              }}
              tier="available"
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-ink-dim)] block">No players available</span>
        </div>
      )}
    </div>
  );
}
