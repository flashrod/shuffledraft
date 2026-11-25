"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  verifyAdmin,
  isAuthed,
  signOutAdmin,
  listPlayers,
  updatePlayer,
  getImportLog,
  type AdminPlayer,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [players, setPlayers] = React.useState<AdminPlayer[]>([]);
  const [log, setLog] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setAuthed(await isAuthed());
      if (authed) {
        setPlayers(await listPlayers(""));
        setLog(await getImportLog());
      }
    })();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const ok = await verifyAdmin(password);
    if (ok) {
      setAuthed(true);
      setPlayers(await listPlayers(""));
      setLog(await getImportLog());
    } else {
      setError("Invalid password");
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    setAuthed(false);
    setPlayers([]);
    setLog([]);
    router.push("/admin");
  }

  async function handleUpdate(p: AdminPlayer, field: string, value: any) {
    await updatePlayer({ id: p.id, [field]: value });
    setMessage(`Updated ${p.name}`);
    setTimeout(() => setMessage(""), 2000);
    setPlayers(await listPlayers(""));
  }

  const positions: Array<{ label: string; value: "GK" | "DEF" | "MID" | "FWD" }> = [
    { label: "GK", value: "GK" },
    { label: "DEF", value: "DEF" },
    { label: "MID", value: "MID" },
    { label: "FWD", value: "FWD" },
  ];

  if (authed === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--color-muted)] text-sm">Loading…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card className="w-full max-w-md p-8 rounded border border-[var(--color-border)] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Admin login</CardTitle>
            <CardDescription>Enter the admin password to manage players and imports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded border border-[var(--color-pale-red-text)]/20 bg-[var(--color-pale-red-bg)] p-3 text-[var(--color-pale-red-text)] text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-[var(--color-muted)] text-sm">Player curation &amp; import log</p>
        </div>
        <Button onClick={handleSignOut}>Sign out</Button>
      </div>

      {message && (
        <div className="rounded border border-[var(--color-pale-green-text)]/20 bg-[var(--color-pale-green-bg)] p-3 text-[var(--color-pale-green-text)] text-sm">
          {message}
        </div>
      )}

      <div className="rounded border border-[var(--color-border)] bg-white p-4 shadow-sm">
        <div className="flex gap-2 mb-3">
          <Input placeholder="Search player or club…" className="flex-1" />
          <Button onClick={() => {}}>Search</Button>
        </div>
      </div>

      <div className="rounded border border-[var(--color-border)] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Name</TableHead>
              <TableHead className="w-16">Position</TableHead>
              <TableHead className="w-16">Nation</TableHead>
              <TableHead className="w-32">Club</TableHead>
              <TableHead className="w-16">Rating</TableHead>
              <TableHead className="w-16">Tier</TableHead>
              <TableHead>Included</TableHead>
              <TableHead className="w-24">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <Select value={p.position} onValueChange={(v) => handleUpdate(p, "position", v)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{p.nation}</TableCell>
                <TableCell className="text-[var(--color-muted-soft)] text-xs truncate">{p.club ?? "—"}</TableCell>
                <TableCell className="number-mono text-sm font-medium">{p.rating}</TableCell>
                <TableCell className="text-[var(--color-muted-soft)] text-xs">{p.tier ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={p.included ? "default" : "outline"}
                    onClick={() => handleUpdate(p, "included", !p.included)}
                  >
                    {p.included ? "Yes" : "No"}
                  </Button>
                </TableCell>
                <TableCell className="text-[var(--color-muted-soft)] text-xs">{p.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded border border-[var(--color-border)] bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">Import log</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Upserted</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(log ?? []).map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>{row.source}</TableCell>
                <TableCell className="text-[var(--color-muted-soft)] text-xs">{row.status}</TableCell>
                <TableCell className="number-mono text-xs">{row.playersUpserted}</TableCell>
                <TableCell className="text-[var(--color-muted-soft)] text-xs">{new Date(row.startedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
