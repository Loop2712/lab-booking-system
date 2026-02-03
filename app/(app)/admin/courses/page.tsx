"use client";
import type { Course } from "./types";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [q, setQ] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  async function load() {
    const r = await fetch("/api/admin/courses");
    const j = await r.json();
    setItems(j.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((c) => {
      const hay = `${c.code} ${c.name}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [items, q]);

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

      const res = await fetch(`/api/admin/courses/import?dryRun=${dryRun ? "1" : "0"}`, {
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

  async function create() {
    const r = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    setCode("");
    setName("");
    load();
    setOpenCreate(false);
  }

  async function del(id: string) {
    const r = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">จัดการรายวิชา</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>เพิ่มรายวิชา</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มรายวิชา</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Code (เช่น SCS409)" value={code} onChange={(e) => setCode(e.target.value)} />
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                ยกเลิก
              </Button>
              <Button onClick={create}>บันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
                  placeholder="ค้นหารายวิชา เช่น SCS409 หรือชื่อวิชา"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="sm:col-span-2 flex gap-2">
                  <Button variant="outline" onClick={load}>
                    รีเฟรช
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Import Courses (XLSX/CSV)</div>
              <div className="text-sm text-muted-foreground">
                รูปแบบไฟล์: <span className="font-mono">code, name</span>
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
                  <Link href="/api/admin/courses/template?format=xlsx">ดาวน์โหลดเทมเพลต (XLSX)</Link>
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>รายการรายวิชา</CardTitle>
          <div className="text-sm text-muted-foreground">{filteredItems.length} รายการ</div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredItems.map((c) => (
            <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{c.code}</div>
                <div className="text-sm text-muted-foreground">{c.name}</div>
              </div>
              <Button variant="destructive" onClick={() => del(c.id)}>
                Delete
              </Button>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-sm text-muted-foreground">ยังไม่มีรายวิชา</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

