"use client";
import type { KeyRow, KeyStatus, Room } from "./types";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

 code: string; name: string; isActive: boolean };
  keyCode: string;
  status: KeyStatus;
  roomId: string;
  room?: Room;
};

export default function AdminKeysPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<{
    keyCode: string;
    roomId: string;
    status: KeyStatus;
  }>({
    keyCode: "",
    roomId: "",
    status: "AVAILABLE",
  });

  const roomOptions = useMemo(() => rooms.filter((r) => r.isActive), [rooms]);

  async function loadRooms() {
    setError(null);
    const res = await fetch("/api/admin/rooms", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      setError(json?.message || "โหลดห้องไม่สำเร็จ");
      return;
    }
    setRooms(json.rooms ?? []);
  }

  async function loadKeys() {
    setError(null);
    const res = await fetch("/api/admin/keys", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      setError(json?.message || "โหลดกุญแจไม่สำเร็จ");
      return;
    }
    setKeys(json.keys ?? []);
  }

  useEffect(() => {
    loadRooms();
    loadKeys();
  }, []);

  async function createKey() {
    setError(null);

    const trimmedKeyCode = form.keyCode.trim();
    if (!trimmedKeyCode) {
      setError("กรุณากรอกรหัสกุญแจ (Key Code)");
      return;
    }
    if (!form.roomId) {
      setError("กรุณาเลือกห้องก่อน");
      return;
    }

    setBusy(true);
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, keyCode: trimmedKeyCode }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "เพิ่มกุญแจไม่สำเร็จ");
      return;
    }

    setForm({ keyCode: "", roomId: "", status: "AVAILABLE" });
    await loadKeys();
  }

  async function updateKeyStatus(keyId: string, status: KeyStatus) {
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/admin/keys/${keyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json().catch(() => ({}));

    setBusy(false);
    if (!res.ok || !json?.ok) {
      setError(json?.message || "อัปเดตไม่สำเร็จ");
      return;
    }

    await loadKeys();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Key</h1>
        <p className="text-sm text-muted-foreground">
          ManageKey (1 Room = 1 Key)
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AddKey</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Key Code (unique) เช่น LAB-A-KEY-1"
            value={form.keyCode}
            onChange={(e) =>
              setForm((s) => ({ ...s, keyCode: e.target.value }))
            }
            disabled={busy}
          />

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm((s) => ({ ...s, status: e.target.value as KeyStatus }))
            }
            disabled={busy}
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="BORROWED">BORROWED</option>
            <option value="LOST">LOST</option>
            <option value="DAMAGED">DAMAGED</option>
          </select>

          {/* ✅ เพิ่มเลือกห้อง เพื่อให้ roomId ไม่ว่าง */}
          <select
            className="sm:col-span-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.roomId}
            onChange={(e) => setForm((s) => ({ ...s, roomId: e.target.value }))}
            disabled={busy}
          >
            <option value="">
              {roomOptions.length ? "เลือกห้อง (Room)" : "ยังไม่มีห้องให้เลือก"}
            </option>
            {roomOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>

          <div className="sm:col-span-2">
            <Button onClick={createKey} disabled={busy}>
              {busy ? "กำลังบันทึก..." : "เพิ่มกุญแจ"}
            </Button>
            <Button
              variant="outline"
              className="ml-2"
              onClick={loadKeys}
              disabled={busy}
            >
              รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ListKey</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KeyCode</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono">{k.keyCode}</TableCell>

                  <TableCell>
                    {k.room ? (
                      <span>
                        {k.room.code} — {k.room.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell>{k.status}</TableCell>

                  <TableCell className="text-right">
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      value={k.status}
                      onChange={(e) =>
                        updateKeyStatus(k.id, e.target.value as KeyStatus)
                      }
                      disabled={busy}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="BORROWED">BORROWED</option>
                      <option value="LOST">LOST</option>
                      <option value="DAMAGED">DAMAGED</option>
                    </select>
                  </TableCell>
                </TableRow>
              ))}

              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    Key
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
