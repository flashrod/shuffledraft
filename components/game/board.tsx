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
    <div className="board rounded-[18px] border border-[var(--color-border)] p-4 shadow-sm">
      {players.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
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
        <div className="text-center py-10">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-[var(--color-muted-soft)] block mb-2">No players available</span>
        </div>
      )}
    </div>
  );
}
