"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast, Toaster as Sonner } from "sonner";
import { GameShell } from "@/components/game/game-shell";
import { createRoom, joinRoom } from "@/app/actions/rooms";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"home" | "game" | "join">("home");
  const [joinCode, setJoinCode] = React.useState("");
  const [hostName, setHostName] = React.useState("Host");
  const [nManagers, setNManagers] = React.useState(4);
  const [pickTimer, setPickTimer] = React.useState<number | null>(60);
  const [lineupTimer, setLineupTimer] = React.useState<number | null>(60);
  const [botDifficulty, setBotDifficulty] = React.useState<"easy" | "normal" | "hard">("normal");
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createRoom({
        hostDisplayName: hostName,
        mode: "current",
        pickTimer,
        lineupTimer,
        nManagers,
        botDifficulty,
      });
      if (res.ok && res.code) {
        toast(`Room created — ${res.code}`);
        router.push(`/room/${res.code}`);
      } else {
        toast(res.error || "Failed to create room");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await joinRoom({ code: joinCode.toUpperCase(), displayName: "You" });
      if (res.ok) {
        toast("Joined room");
        router.push(`/room/${joinCode.toUpperCase()}`);
      } else {
        toast(res.error || "Failed to join room");
      }
    } catch {
      toast("Failed to join room");
    }
  };

  return (
    <div className="flex flex-col min-h-svh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Sonner />
      {mode === "home" ? (
        <div className="flex-1 p-6 md:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-5xl"
          >
            <div className="text-center mb-16">
              <h1 className="text-[48px] md:text-[64px] font-bold tracking-tighter leading-none uppercase mb-4">Shuffle Draft</h1>
              <p className="text-[var(--color-ink-dim)] text-[11px] uppercase tracking-wider">
                Draft a starting XI. Vote on the best team. No match simulation — just the draft.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1px] bg-[var(--color-border)] p-[1px]">
              <div className="lg:col-span-7">
                <Card className="border-none p-0 bg-[var(--color-surface)]">
                  <CardContent className="p-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                      <CardHeader className="border-b border-[var(--color-border)] pb-3">
                        <CardTitle className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">Create room (host)</CardTitle>
                      </CardHeader>
                      <Input
                        placeholder="Your name"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        className="bg-transparent border-b border-[var(--color-border)] focus:border-[var(--color-accent)] px-0 text-[var(--color-ink)] placeholder-[var(--color-ink-dim)]"
                      />
                      <div className="grid grid-cols-3 gap-[1px] bg-[var(--color-border)] p-[1px]">
                        <NumberInput
                          label="Managers"
                          value={nManagers}
                          onChange={(v) => setNManagers(Math.min(8, Math.max(2, v)))}
                          min={2}
                          max={8}
                        />
                        <SelectTimer
                          label="Pick timer"
                          value={pickTimer}
                          onChange={(v) => setPickTimer(v as number | null)}
                          options={[15, 30, 60, null]}
                        />
                        <SelectTimer
                          label="Lineup timer"
                          value={lineupTimer}
                          onChange={(v) => setLineupTimer(v as number | null)}
                          options={[60, 120, 180, null]}
                        />
                      </div>
                      <SelectTimer
                        label="Bot difficulty"
                        value={botDifficulty}
                        onChange={(v) => setBotDifficulty(v as "easy" | "normal" | "hard")}
                        options={[
                          { label: "Easy", value: "easy" },
                          { label: "Normal", value: "normal" },
                          { label: "Hard", value: "hard" },
                        ]}
                        isText
                      />
                      <Button
                        type="submit"
                        disabled={creating}
                        className="w-full py-4 bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent-dim)] disabled:opacity-40 text-[10px] font-bold uppercase tracking-wider"
                      >
                        {creating ? "Creating…" : "Create room"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-5">
                <div className="space-y-3">
                  <Button onClick={() => setMode("game")} className="w-full py-4 text-[16px] font-bold uppercase tracking-wider bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink)]">
                    Play vs bots
                  </Button>
                  <Button
                    onClick={() => setMode("join")}
                    className="w-full py-3 border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink-dim)] text-[10px] font-bold uppercase tracking-wider"
                  >
                    Join with code
                  </Button>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-[1px] bg-[var(--color-border)] p-[1px] text-[var(--color-ink-dim)] text-[9px] uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">2–8 managers</Badge>
                    <span>per room</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">11 rounds</Badge>
                    <span>shuffle draft</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">Lineup phase</Badge>
                    <span>before voting</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">Secret vote</Badge>
                    <span>+ results</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : mode === "join" ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-6 md:p-12"
        >
          <div className="mx-auto max-w-xl">
            <div className="text-center mb-10">
              <h2 className="text-[24px] font-bold uppercase tracking-tighter leading-none mb-2">Join room</h2>
              <p className="text-[var(--color-ink-dim)] text-[9px] uppercase tracking-wider">Enter the 6-character join code</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <Input
                placeholder="ABCDEF"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="bg-transparent border-b border-[var(--color-border)] focus:border-[var(--color-accent)] px-0 text-[var(--color-ink)] text-lg text-center uppercase placeholder-[var(--color-ink-dim)]"
                maxLength={6}
              />
              <Button type="submit" className="w-full py-3 bg-[var(--color-ink)] text-[var(--color-bg)] border-[var(--color-ink)] text-[10px] font-bold uppercase tracking-wider">
                Join room
              </Button>
            </form>
            <Button
              variant="outline"
              onClick={() => setMode("home")}
              className="w-full py-3 border-[var(--color-border)] hover:bg-black/20 text-[var(--color-ink-dim)] text-[10px] font-bold uppercase tracking-wider"
            >
              Back
            </Button>
          </div>
        </motion.div>
      ) : (
        <GameShell />
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-1 bg-[var(--color-surface)] p-2">
      <label className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-ink-dim)]">{label}</label>
      <div className="flex gap-[1px] bg-[var(--color-border)]">
        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
          <Button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider flex-1 border-none bg-transparent hover:bg-[var(--color-surface)]/50",
              value === n
                ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
                : "text-[var(--color-ink-dim)]",
            )}
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SelectTimer({
  label,
  value,
  onChange,
  options,
  isText = false,
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string | number | null) => void;
  options: Array<string | number | null | { label: string; value: string | number | null }>;
  isText?: boolean;
}) {
  return (
    <div className="space-y-1 bg-[var(--color-surface)] p-2">
      <label className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-ink-dim)]">{label}</label>
      <div className="flex gap-[1px] bg-[var(--color-border)]">
        {options.map((o) => {
          let label: string;
          let val: string | number | null;
          if (o === null) {
            label = "Off";
            val = null;
          } else if (typeof o === "object") {
            label = o.label;
            val = o.value;
          } else {
            label = `${o}s`;
            val = o;
          }
          return (
            <Button
              key={String(val)}
              onClick={() => onChange(val)}
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider flex-1 border-none bg-transparent hover:bg-[var(--color-surface)]/50",
                value === val
                  ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
                  : "text-[var(--color-ink-dim)]",
              )}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

const cn = (a: string, b: string) => [a, b].filter(Boolean).join(" ");
