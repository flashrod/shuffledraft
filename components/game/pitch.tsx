"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PITCH_W = 100;
const PITCH_H = 74;

function lineColor(line: "GK" | "DEF" | "MID" | "FWD") {
  switch (line) {
    case "GK": return "var(--color-ink)";
    case "DEF": return "var(--color-ink)";
    case "MID": return "var(--color-ink)";
    case "FWD": return "var(--color-accent)";
  }
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "var(--color-ink)";
    case "DEF": return "var(--color-ink)";
    case "MID": return "var(--color-ink)";
    case "FWD": return "var(--color-accent)";
  }
  return "var(--color-ink-dim)";
}

export interface PitchSlotProps {
  index: number;
  role: string;
  line: "GK" | "DEF" | "MID" | "FWD";
  x: number;
  y: number;
  player: { id: string; name: string; position: string; rating: number } | null;
  occupied: boolean;
  onPlace?: (playerId: string) => void;
  onRemove?: () => void;
  editable?: boolean;
  crossLine?: boolean;
  effectiveRating?: number;
}

export function PitchSlot({
  index, role, line, x, y, player, occupied, onPlace, onRemove, editable = true, crossLine, effectiveRating,
}: PitchSlotProps) {
  const color = lineColor(line);
  const cx = x;
  const cy = y;

  return (
    <g
      className={cn("cursor-pointer select-none", occupied ? "" : "")}
      onClick={(editable && !occupied) ? (() => onPlace?.("")) : undefined}
    >
      <circle
        cx={cx}
        cy={cy}
        r={occupied ? 7 : 4}
        fill={occupied ? color : "transparent"}
        stroke={color}
        strokeWidth={occupied ? 0 : 1}
        strokeOpacity={occupied ? 1 : 0.5}
      />
      {occupied && player && (
        <foreignObject x={cx - 22} y={cy - 28} width={44} height={44}>
          <div
            className={cn(
              "absolute flex flex-col items-center px-1.5 pb-1 text-[8px] font-bold uppercase leading-none shadow-none",
              "border border-solid rounded-none bg-[var(--color-surface)]/90",
              crossLine ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20" : "border-[var(--color-border)]",
            )}
            style={{ transform: `translate(-50%, -50%)` }}
          >
            <span className="truncate w-[40px] leading-none">{player.name}</span>
            {crossLine && effectiveRating !== undefined ? (
              <span className="mt-0.5 text-[7px] text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1 leading-none border border-[var(--color-accent)]/20">
                {effectiveRating}
              </span>
            ) : null}
          </div>
        </foreignObject>
      )}
      {editable && !occupied && (
        <rect
          x={cx - 10}
          y={cy - 10}
          width={20}
          height={20}
          fill="transparent"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2,2"
          strokeOpacity={0.5}
        />
      )}
    </g>
  );
}

interface PitchProps {
  slots: Array<{ role: string; line: "GK" | "DEF" | "MID" | "FWD"; x: number; y: number }>;
  fills: Record<number, { id: string; name: string; position: string; rating: number } | null>;
  onPlace?: (slotIndex: number, playerId: string | null) => void;
  onRemove?: (slotIndex: number) => void;
  editable?: boolean;
  crossLineBySlot?: Record<number, boolean>;
  effectiveRatingBySlot?: Record<number, number>;
}

export function Pitch({
  slots, fills, onPlace, onRemove, editable = true, crossLineBySlot = {}, effectiveRatingBySlot = {},
}: PitchProps) {
  return (
    <svg
      className="w-full max-w-md h-[56vh] max-h-[400px] rounded-none border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "none" }}
    >
      <rect width={PITCH_W} height={PITCH_H} fill="var(--color-surface)" />
      <line x1={50} y1={0} x2={50} y2={PITCH_H} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4,4" />
      <circle cx={50} cy={PITCH_H / 2} r={9} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      <rect x={0} y={PITCH_H - 3} width={PITCH_W} height={3} fill="var(--color-ink)" />
      <rect x={0} y={0} width={PITCH_W} height={3} fill="var(--color-ink)" />
      <rect x={15} y={PITCH_H - 16} width={20} height={13} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      <rect x={65} y={PITCH_H - 16} width={20} height={13} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      <rect x={15} y={3} width={20} height={13} fill="none" stroke="var(--color-border)" strokeWidth={1} />
      <rect x={65} y={3} width={20} height={13} fill="none" stroke="var(--color-border)" strokeWidth={1} />

      {slots.map((slot, idx) => {
        const fill = fills[idx];
        return (
          <PitchSlot
            key={idx}
            index={idx}
            {...slot}
            player={fill ?? null}
            occupied={!!fill}
            onPlace={(playerId) => onPlace?.(idx, playerId || null)}
            onRemove={() => onRemove?.(idx)}
            editable={editable}
            crossLine={crossLineBySlot[idx]}
            effectiveRating={effectiveRatingBySlot[idx]}
          />
        );
      })}
    </svg>
  );
}
