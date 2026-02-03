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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminKeysPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

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
      return false;
    }
    if (!form.roomId) {
      setError("กรุณาเลือกห้องก่อน");
      return false;
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
      return false;
    }

    setForm({ keyCode: "", roomId: "", status: "AVAILABLE" });
    await loadKeys();
    return true;
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Key</h1>
          <p className="text-sm text-muted-foreground">
            ManageKey (1 Room = 1 Key)
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>เพิ่มกุญแจ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มกุญแจ</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Key Code (unique) เช่น LAB-A-KEY-1"
                value={form.keyCode}
                onChange={(e) =>
                  setForm((s) => ({ ...s, keyCode: e.target.value }))
                }
                disabled={busy}
              />

              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, status: v as KeyStatus }))
                }
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                  <SelectItem value="BORROWED">BORROWED</SelectItem>
                  <SelectItem value="LOST">LOST</SelectItem>
                  <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={form.roomId}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, roomId: v }))
                }
                disabled={busy}
              >
                <SelectTrigger className="sm:col-span-2">
                  <SelectValue placeholder="เลือกห้อง (Room)" />
                </SelectTrigger>
                <SelectContent>
                  {roomOptions.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      ยังไม่มีห้องให้เลือก
                    </SelectItem>
                  ) : null}
                  {roomOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button
                onClick={async () => {
                  const ok = await createKey();
                  if (ok) setOpenCreate(false);
                }}
                disabled={busy}
              >
                {busy ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">ListKey</CardTitle>
          <Button variant="outline" onClick={loadKeys} disabled={busy}>
            รีเฟรช
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KeyCode</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ผู้ถือกุญแจปัจจุบัน</TableHead>
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

                  <TableCell>
                    {k.currentHolder ? (
                      <div className="space-y-0.5 text-sm">
                        <div className="font-medium">
                          {k.currentHolder.firstName} {k.currentHolder.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {k.currentHolder.studentId ?? k.currentHolder.email ?? "-"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Select
                      value={k.status}
                      onValueChange={(v) => updateKeyStatus(k.id, v as KeyStatus)}
                      disabled={busy}
                    >
                      <SelectTrigger className="h-8 w-36 ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                        <SelectItem value="BORROWED">BORROWED</SelectItem>
                        <SelectItem value="LOST">LOST</SelectItem>
                        <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}

              {keys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
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
