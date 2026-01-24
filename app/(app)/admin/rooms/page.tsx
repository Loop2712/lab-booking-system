"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import type { Room } from "./types";
import { loadRooms } from "./loadRooms";
import { createRoom } from "./createRoom";
import { toggleRoomActive } from "./toggleRoomActive";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
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

  const load = async () => {
    await loadRooms({ setError, setRooms });
  };

  useEffect(() => {
    load();
  }, []);

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
            <Button
              onClick={() =>
                createRoom({
                  form,
                  setBusy,
                  setError,
                  resetForm: () =>
                    setForm({ roomNumber: "", floor: "1", computerCount: "0", code: "", name: "", isActive: true }),
                  refresh: load,
                })
              }
              disabled={busy}
            >
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
                    onCheckedChange={() =>
                      toggleRoomActive({
                        room: r,
                        setBusy,
                        setError,
                        refresh: load,
                      })
                    }
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
