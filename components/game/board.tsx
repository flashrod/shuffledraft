"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlayerCard } from "@/components/game/player-card";
import type { Player } from "@/lib/game";

interface BoardProps {
  setIndex: number;
  allPlayers: Player[];       // all players originally in this set
  availablePlayerIds: Set<string>; // playerIds still available
  takenBy: Record<string, string>; // playerId -> memberName who took it
  onPick: (player: Player) => void;
  disabled?: boolean;
}

export function Board({
  setIndex,
  allPlayers,
  availablePlayerIds,
  takenBy,
  onPick,
  disabled = false,
}: BoardProps) {
  const players = allPlayers ?? [];

  return (
    <div className="compartment rounded-none p-[2px]">
      {players.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 bg-[var(--color-border)]">
          {players.map((p) => {
            const isAvailable = availablePlayerIds.has(p.id);
            const pickerName = takenBy[p.id];
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center justify-center"
              >
                <PlayerCard
                  player={p}
                  selected={false}
                  onSelect={(sel) => {
                    if (!disabled && isAvailable) onPick(sel);
                  }}
                  tier="available"
                  isAvailable={isAvailable}
                  takenBy={pickerName}
                  square
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-24">
          <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-ink-dim)] block">No players available</span>
        </div>
      )}
    </div>
  );
}
