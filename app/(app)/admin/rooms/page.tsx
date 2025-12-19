"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  computerCount: number;
  code: string;
  name: string;
  isActive: boolean;
  _count?: { keys: number };
};

export default function Adminห้องPage() {
  const [rooms, setห้อง] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    floor: "1",
    computerCount: "0",
    code: "",
    name: "",
    isActive: true,
  });

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/rooms", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message || "โหลดห้องไม่สำเร็จ");
      return;
    }
    setห้อง(json.rooms ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createRoom() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        floor: Number(form.floor),
        computerCount: Number(form.computerCount),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "เพิ่มห้องไม่สำเร็จ");
      return;
    }

    setForm({ roomNumber: "", floor: "1", computerCount: "0", code: "", name: "", isActive: true });
    await load();
  }

  async function toggleActive(room: Room) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !room.isActive }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "อัปเดตไม่สำเร็จ");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ห้อง</h1>
        <p className="text-sm text-muted-foreground">จัดการห้อง (เพิ่ม/ปิดใช้งาน)</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เพิ่มห้อง</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Room Number เช่น 401" value={form.roomNumber}
            onChange={(e) => setForm((s) => ({ ...s, roomNumber: e.target.value }))} />
          <Input placeholder="Floor" value={form.floor}
            onChange={(e) => setForm((s) => ({ ...s, floor: e.target.value }))} />
          <Input placeholder="Computer Count" value={form.computerCount}
            onChange={(e) => setForm((s) => ({ ...s, computerCount: e.target.value }))} />
          <Input placeholder="Code (unique) เช่น LAB-A" value={form.code}
            onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} />
          <Input placeholder="Name เช่น ห้องปฏิบัติการ A" value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />

          <div className="flex items-center gap-3">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} />
            <span className="text-sm">เปิดใช้งาน</span>
          </div>

          <div className="sm:col-span-2">
            <Button onClick={createRoom} disabled={busy}>
              {busy ? "กำลังบันทึก..." : "เพิ่มห้อง"}
            </Button>
            <Button variant="outline" className="ml-2" onClick={load} disabled={busy}>
              รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการห้อง</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>PC</TableHead>
                <TableHead>กุญแจ</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.roomNumber}</TableCell>
                  <TableCell>{r.floor}</TableCell>
                  <TableCell>{r.computerCount}</TableCell>
                  <TableCell>{r._count?.keys ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={r.isActive} 
                    onCheckedChange={() => toggleActive(r)} 
                    disabled={busy} /> 
                  </TableCell>
                </TableRow>
              ))}
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    ยังไม่มีข้อมูลห้อง
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
