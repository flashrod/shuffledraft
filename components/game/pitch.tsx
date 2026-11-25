"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PITCH_W = 100;
const PITCH_H = 74;

function lineColor(line: "GK" | "DEF" | "MID" | "FWD") {
  switch (line) {
    case "GK": return "var(--color-pale-blue-text)";
    case "DEF": return "var(--color-pale-green-text)";
    case "MID": return "var(--color-pale-yellow-text)";
    case "FWD": return "var(--color-pale-red-text)";
  }
}

function posColor(position: string) {
  switch (position) {
    case "GK": return "var(--color-pale-blue-text)";
    case "DEF": return "var(--color-pale-green-text)";
    case "MID": return "var(--color-pale-yellow-text)";
    case "FWD": return "var(--color-pale-red-text)";
  }
  return "var(--color-muted)";
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
      className={cn("cursor-pointer select-none transition-transform duration-200", occupied ? "scale-105" : "")}
      onClick={(editable && !occupied) ? (() => onPlace?.("")) : undefined}
    >
      <circle
        cx={cx}
        cy={cy}
        r={occupied ? 7 : 4.5}
        fill={occupied ? color : "transparent"}
        stroke={color}
        strokeWidth={occupied ? 0 : 2}
        strokeOpacity={occupied ? 1 : 0.45}
        className="transition-all duration-200"
      />
      {occupied && player && (
        <foreignObject x={cx - 22} y={cy - 28} width={44} height={44}>
          <div
            className={cn(
              "absolute flex flex-col items-center px-1.5 pb-1 text-[8px] font-bold leading-none shadow-sm",
              "border border-solid rounded bg-white/80 backdrop-blur-sm",
              crossLine ? "border-[var(--color-pale-red-text)]/40 bg-[var(--color-pale-red-bg)]/90" : "border-[var(--color-border)]/50 bg-white/90",
            )}
            style={{ transform: `translate(-50%, -50%)` }}
          >
            <span className="truncate w-[40px] leading-none">{player.name}</span>
            {crossLine && effectiveRating !== undefined ? (
              <span className="mt-0.5 text-[7px] text-[var(--color-pale-red-text)] bg-[var(--color-pale-red-bg)] px-1 leading-none">
                {effectiveRating}
              </span>
            ) : null}
          </div>
        </foreignObject>
      )}
      {editable && !occupied && (
        <rect
          x={cx - 11}
          y={cy - 11}
          width={22}
          height={22}
          fill="transparent"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="3,3"
          strokeOpacity={0.5}
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
      className="w-full max-w-md h-[56vh] max-h-[400px] rounded-[14px] border border-[var(--color-border)] bg-white shadow-sm overflow-hidden"
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "none" }}
    >
      <defs>
        <pattern id="grass" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="var(--color-surface)" />
          <path d="M0 5 L10 5 M5 0 L5 10" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={PITCH_W} height={PITCH_H} fill="url(#grass)" />
      <line x1={50} y1={0} x2={50} y2={PITCH_H} stroke="rgba(0,0,0,0.10)" strokeWidth={2} strokeDasharray="6,6" />
      <circle cx={50} cy={PITCH_H / 2} r={9} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={2} />
      <rect x={0} y={PITCH_H - 4} width={PITCH_W} height={4} fill="rgba(0,0,0,0.08)" />
      <rect x={0} y={0} width={PITCH_W} height={4} fill="rgba(0,0,0,0.08)" />
      <rect x={15} y={PITCH_H - 18} width={20} height={14} fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      <rect x={65} y={PITCH_H - 18} width={20} height={14} fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      <rect x={15} y={4} width={20} height={14} fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />
      <rect x={65} y={4} width={20} height={14} fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.10)" strokeWidth={1} />

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
