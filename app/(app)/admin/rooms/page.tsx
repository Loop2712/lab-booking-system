"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImportForm from "@/components/admin/ImportForm";

import type { Room } from "./types";
import { loadRooms } from "./loadRooms";
import { createRoom } from "./createRoom";
import { toggleRoomActive } from "./toggleRoomActive";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "1" | "0">("all");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);

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

  const filteredRooms = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rooms.filter((room) => {
      const hay = `${room.code} ${room.name} ${room.roomNumber} ${room.floor}`.toLowerCase();
      const matchKeyword = !kw || hay.includes(kw);
      const matchActive =
        activeFilter === "all"
          ? true
          : activeFilter === "1"
            ? room.isActive
            : !room.isActive;
      return matchKeyword && matchActive;
    });
  }, [rooms, q, activeFilter]);

  async function runImport(dryRun: boolean) {
    if (!importFile) {
      setImportErr("กรุณาเลือกไฟล์ XLSX/CSV");
      return;
    }
    setImportBusy(true);
    setImportMsg(null);
    setImportErr(null);

    try {
      const fd = new FormData();
      fd.append("file", importFile);

      const res = await fetch(`/api/admin/rooms/import?dryRun=${dryRun ? "1" : "0"}`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch {}

      if (!res.ok || !data?.ok) {
        console.error("API ERROR RAW:", text);
        setImportErr(data?.message ?? `HTTP ${res.status}`);
        return;
      }

      if (dryRun) {
        setImportPreview(data);
        setImportMsg(`ตรวจสอบผ่าน: ทั้งหมด ${data.total} แถว | จะสร้างใหม่ ${data.wouldCreate} | จะอัปเดต ${data.wouldUpdate}`);
      } else {
        setImportPreview(null);
        setImportMsg(`นำเข้าสำเร็จ: ทั้งหมด ${data.total} แถว | สร้างใหม่ ${data.created} | อัปเดต ${data.updated}`);
        await load();
      }
    } catch (e: any) {
      setImportPreview(null);
      setImportErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ห้อง</h1>
          <p className="text-sm text-muted-foreground">จัดการห้อง (เพิ่ม/ปิดใช้งาน)</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>เพิ่มห้อง</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มห้อง</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Room Number เช่น 401"
                value={form.roomNumber}
                onChange={(e) => setForm((s) => ({ ...s, roomNumber: e.target.value }))}
              />
              <Input
                placeholder="Floor"
                value={form.floor}
                onChange={(e) => setForm((s) => ({ ...s, floor: e.target.value }))}
              />
              <Input
                placeholder="Computer Count"
                value={form.computerCount}
                onChange={(e) => setForm((s) => ({ ...s, computerCount: e.target.value }))}
              />
              <Input
                placeholder="Code (unique) เช่น LAB-A"
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
              />
              <Input
                placeholder="Name เช่น ห้องปฏิบัติการ A"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />

              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} />
                <span className="text-sm">เปิดใช้งาน</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button
                onClick={async () => {
                  const ok = await createRoom({
                    form,
                    setBusy,
                    setError,
                    resetForm: () =>
                      setForm({ roomNumber: "", floor: "1", computerCount: "0", code: "", name: "", isActive: true }),
                    refresh: load,
                  });
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">ค้นหา / ตัวกรอง และนำเข้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="text-sm font-semibold">ค้นหา / ตัวกรอง</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="1">ใช้งาน</SelectItem>
                    <SelectItem value="0">ปิดใช้งาน</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={load} disabled={busy}>
                    รีเฟรช
                  </Button>
                </div>
              </div>
            </div>

            <ImportForm
              title="Import Rooms (XLSX/CSV)"
              formatHint={
                <>
                  รูปแบบไฟล์:{" "}
                  <span className="font-mono">code, name, roomNumber, floor, computerCount, isActive</span>{" "}
                  (isActive รองรับ <span className="font-mono">1/0</span> หรือ{" "}
                  <span className="font-mono">true/false</span>)
                </>
              }
              templateHref="/api/admin/rooms/template?format=xlsx"
              file={importFile}
              onFileChange={(f) => {
                setImportFile(f);
                setImportPreview(null);
                setImportMsg(null);
                setImportErr(null);
              }}
              onDryRun={() => runImport(true)}
              onImport={() => runImport(false)}
              busy={importBusy}
              preview={importPreview}
              message={importMsg}
              error={importErr}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายการห้อง</CardTitle>
          <div className="text-sm text-muted-foreground">{filteredRooms.length} ห้อง</div>
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
                <TableHead>ผู้ถือกุญแจปัจจุบัน</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.roomNumber}</TableCell>
                  <TableCell>{r.floor}</TableCell>
                  <TableCell>{r.computerCount}</TableCell>
                  <TableCell>{r._count?.keys ?? 0}</TableCell>
                  <TableCell>
                    {r.currentHolder ? (
                      <div className="space-y-0.5 text-sm">
                        <div className="font-medium">
                          {r.currentHolder.firstName} {r.currentHolder.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.currentHolder.studentId ?? r.currentHolder.email ?? "-"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
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
              {filteredRooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
                    ไม่พบข้อมูลห้อง
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

