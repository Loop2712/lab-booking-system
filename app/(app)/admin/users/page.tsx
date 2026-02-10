"use client";
import type { Gender, Role, StudentType, UserRow } from "./types";
import { toYmd } from "./toYmd";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImportForm from "@/components/admin/ImportForm";


export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"1" | "0" | "all">("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // CSV import
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  async function runImport(dryRun: boolean) {
    if (!csvFile) {
      setImportErr("กรุณาเลือกไฟล์ CSV");
      return;
    }
    setImportBusy(true);
    setImportMsg(null);
    setImportErr(null);

    try {
      const fd = new FormData();
      fd.append("file", csvFile);

      const res = await fetch(`/api/admin/users/import?dryRun=${dryRun ? "1" : "0"}`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let data: any = null;
        try { data = JSON.parse(text); } catch {}

        if (!res.ok || !data.ok) {
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
        // reload list
        await load();
      }
    } catch (e: any) {
      setImportPreview(null);
      setImportErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setImportBusy(false);
    }
  }

  // Create form
  const [openCreate, setOpenCreate] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [major, setMajor] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [studentType, setStudentType] = useState<StudentType | "">("");

  const queryUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (active) sp.set("active", active);
    return `/api/admin/users?${sp.toString()}`;
  }, [q, active]);

  async function load() {
    setError(null);
    const res = await fetch(queryUrl, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message || "โหลด users ไม่สำเร็จ");
      return;
    }
    setItems(json.users ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryUrl]);

  async function createUser() {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("กรุณากรอกวันเกิดรูปแบบ YYYY-MM-DD");
      return false;
    }

    // role-based validation
    if (role === "STUDENT") {
      if (!/^\d{11}$/.test(studentId.trim())) {
        setError("STUDENT ต้องมี studentId 11 หลัก");
        return false;
      }
      if (email.trim()) {
        setError("STUDENT ไม่ต้องกรอก email");
        return false;
      }
    } else {
      if (!email.trim()) {
        setError("TEACHER/ADMIN ต้องมี email");
        return false;
      }
      if (studentId.trim()) {
        setError("TEACHER/ADMIN ไม่ต้องมี studentId");
        return false;
      }
    }

    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        studentId: role === "STUDENT" ? studentId.trim() : null,
        email: role === "STUDENT" ? null : email.trim(),
        major: major.trim() ? major.trim() : null,
        gender: gender || null,
        studentType: studentType || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.detail || json?.message || "สร้าง user ไม่สำเร็จ");
      return false;
    }

    // reset form
    setFirstName("");
    setLastName("");
    setBirthDate("");
    setStudentId("");
    setEmail("");
    setMajor("");
    setGender("");
    setStudentType("");

    await load();
    return true;
  }

  async function deactivateUser(id: string) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "ปิดบัญชีไม่สำเร็จ");
      return;
    }
    await load();
  }

  async function toggleActiveInline(u: UserRow) {
    // ถ้ายังอยากให้ admin เปิดกลับได้: PATCH isActive
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "อัปเดต isActive ไม่สำเร็จ");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">User</h1>
          <p className="text-sm text-muted-foreground">ManageUser (Admin)</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>สร้างผู้ใช้</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้างผู้ใช้</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">STUDENT</SelectItem>
                  <SelectItem value="TEACHER">TEACHER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="วันเกิด (YYYY-MM-DD)"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />

              <Input placeholder="ชื่อ" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="นามสกุล" value={lastName} onChange={(e) => setLastName(e.target.value)} />

              {role === "STUDENT" ? (
                <Input
                  placeholder="รหัสนักศึกษา 11 หลัก"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              ) : (
                <Input
                  placeholder="Email (Teacher/Admin)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              <Input placeholder="สาขา (optional)" value={major} onChange={(e) => setMajor(e.target.value)} />

              <Select value={gender} onValueChange={(v) => setGender(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="เพศ (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">MALE</SelectItem>
                  <SelectItem value="FEMALE">FEMALE</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
                </SelectContent>
              </Select>

              <Select value={studentType} onValueChange={(v) => setStudentType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="ประเภทนักศึกษา (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">REGULAR</SelectItem>
                  <SelectItem value="SPECIAL">SPECIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button
                onClick={async () => {
                  const ok = await createUser();
                  if (ok) setOpenCreate(false);
                }}
                disabled={busy}
              >
                {busy ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
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
      {/* Filters + Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ค้นหา / ตัวกรอง และนำเข้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="text-sm font-semibold">ค้นหา / ตัวกรอง</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  placeholder="ค้นหา: ชื่อ/นามสกุล/รหัสนักศึกษา/email"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <Select value={active} onValueChange={(v) => setActive(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">ใช้งาน</SelectItem>
                    <SelectItem value="0">ปิดใช้งาน</SelectItem>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
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
              title="Import Student (XLSX/CSV)"
              formatHint={
                <>
                  รูปแบบไฟล์: <span className="font-mono">studentId, firstName, lastName</span>{" "}
                  (ถ้าไม่ระบุ birthDate ระบบจะตั้งเป็น <span className="font-mono">2000-01-01</span> |
                  รหัสผ่านเริ่มต้นนักศึกษา = <span className="font-mono">studentId</span>)
                </>
              }
              templateHref="/api/admin/users/template?format=xlsx"
              file={csvFile}
              onFileChange={(f) => {
                setCsvFile(f);
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

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">ListUser</CardTitle>
          <Badge variant="secondary">{items.length} users</Badge>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>รหัสนักศึกษา/อีเมล</TableHead>
                <TableHead>BirthDate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>

                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>

                  <TableCell className="text-sm">
                    {u.role === "STUDENT" ? (
                      <span className="font-mono">{u.studentId ?? "-"}</span>
                    ) : (
                      <span className="font-mono">{u.email ?? "-"}</span>
                    )}
                  </TableCell>

                  <TableCell className="font-mono text-sm">{toYmd(u.birthDate)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={u.isActive} onCheckedChange={() => toggleActiveInline(u)} disabled={busy} />
                      <span className="text-sm text-muted-foreground">{u.isActive ? "ACTIVE" : "INACTIVE"}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deactivateUser(u.id)}
                      disabled={busy || !u.isActive}
                    >
                      ปิดใช้งาน
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ไม่พบผู้ใช้
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

