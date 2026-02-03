"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

import type { Room } from "./types";
import { loadRooms } from "./loadRooms";
import { createRoom } from "./createRoom";
import { toggleRoomActive } from "./toggleRoomActive";

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
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
          <CardTitle>Import Rooms (XLSX/CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            รูปแบบไฟล์: <span className="font-mono">code, name, roomNumber, floor, computerCount, isActive</span>
            {" "} (isActive รองรับ <span className="font-mono">1/0</span> หรือ <span className="font-mono">true/false</span>)
          </div>

          <Input
            type="file"
            accept=".xlsx,.xls,.csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setImportFile(f);
              setImportPreview(null);
              setImportMsg(null);
              setImportErr(null);
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button disabled={!importFile || importBusy} onClick={() => runImport(true)}>
              {importBusy ? "กำลังทำงาน..." : "ตรวจสอบไฟล์ (Dry-run)"}
            </Button>
            <Button
              variant="secondary"
              disabled={!importFile || importBusy || !importPreview}
              onClick={() => runImport(false)}
              title={!importPreview ? "ต้องกด Dry-run ให้ผ่านก่อน" : ""}
            >
              {importBusy ? "กำลังนำเข้า..." : "นำเข้า (Upsert)"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/api/admin/rooms/template?format=xlsx">ดาวน์โหลดเทมเพลต (XLSX)</Link>
            </Button>
          </div>

          {importMsg && <div className="text-sm text-green-600">{importMsg}</div>}
          {importErr && (
            <div className="text-sm text-red-600 whitespace-pre-wrap">
              {importErr}
            </div>
          )}

          {importPreview?.sample?.length ? (
            <div className="pt-2">
              <div className="text-sm font-semibold mb-2">ตัวอย่าง 10 แถวแรก (ผลการอ่านไฟล์)</div>
              <div className="overflow-auto border rounded-md">
                <pre className="text-xs p-3">{JSON.stringify(importPreview.sample, null, 2)}</pre>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายการห้อง</CardTitle>
          <Button variant="outline" onClick={load} disabled={busy}>
            รีเฟรช
          </Button>
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
              {rooms.map((r) => (
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
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
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
