"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PitchSlotProps {
  index: number;
  role: string;
  line: "GK" | "DEF" | "MID" | "FWD";
  x: number; // 0-100
  y: number; // 0-100
  player: { id: string; name: string; position: string; rating: number } | null;
  occupied: boolean;
  onPlace?: (playerId: string) => void;
  onRemove?: () => void;
  editable?: boolean;
  crossLine?: boolean;
  effectiveRating?: number;
}

const PITCH_W = 100;
const PITCH_H = 74;

function lineColor(line: "GK" | "DEF" | "MID" | "FWD") {
  switch (line) {
    case "GK": return "#1f6c9f";
    case "DEF": return "#346538";
    case "MID": return "#956400";
    case "FWD": return "#9f2f2d";
  }
}

export function PitchSlot({
  index, role, line, x, y, player, occupied, onPlace, onRemove, editable = true, crossLine, effectiveRating,
}: PitchSlotProps) {
  const color = lineColor(line);
  const cx = x;
  const cy = y;

  return (
    <g
      className={cn("cursor-pointer select-none transition-transform duration-200", occupied ? "scale-105" : "")}
      onClick={(editable && !occupied) ? (() => onPlace?.("")) : undefined}
    >
      <circle
        cx={cx}
        cy={cy}
        r={occupied ? 7 : 5}
        fill={occupied ? color : "transparent"}
        stroke={color}
        strokeWidth={occupied ? 0 : 2}
        className={cn("transition-all duration-200", occupied ? "" : "opacity-40 hover:opacity-100")}
      />
      {occupied && player && (
        <foreignObject x={cx - 26} y={cy - 30} width={52} height={52}>
          <div
            className={cn(
              "absolute flex flex-col items-center px-1.5 text-[9px] font-medium leading-none shadow-sm",
              "border border-solid rounded bg-white/70 backdrop-blur",
              crossLine ? "border-[var(--color-pale-red-text)]/30 bg-[var(--color-pale-red-bg)]" : "border-[var(--color-border)]",
            )}
            style={{ transform: `translate(-50%, -50%)` }}
          >
            <span className="truncate w-[46px]">{player.name}</span>
            {crossLine && effectiveRating !== undefined ? (
              <span className="text-[8px] text-[var(--color-pale-red-text)] bg-[var(--color-pale-red-bg)]/60 px-1 rounded">
                {effectiveRating}
              </span>
            ) : null}
          </div>
        </foreignObject>
      )}
      {editable && !occupied && (
        <rect
          x={cx - 14}
          y={cy - 14}
          width={28}
          height={28}
          fill="transparent"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4,4"
          className="hover:fill-black/5 transition-colors"
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
      className="w-full max-w-md h-[60vh] max-h-[420px] rounded-sm border border-[var(--color-border)] bg-white overflow-hidden"
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1={50} y1={0} x2={50} y2={PITCH_H} stroke="rgba(0,0,0,0.12)" strokeWidth={2} strokeDasharray="6,6" />
      <circle cx={50} cy={PITCH_H / 2} r={9} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={2} />
      <rect x={0} y={PITCH_H - 5} width={PITCH_W} height={5} fill="rgba(0,0,0,0.10)" />
      <rect x={0} y={0} width={PITCH_W} height={5} fill="rgba(0,0,0,0.10)" />
      <rect x={15} y={PITCH_H - 20} width={20} height={16} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <rect x={65} y={PITCH_H - 20} width={20} height={16} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <rect x={15} y={4} width={20} height={16} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <rect x={65} y={4} width={20} height={16} fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />

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
