"use client";

import type { Gender, Role, StudentType, UserRow } from "./types";
import { useEffect, useMemo, useState } from "react";
import CreateUserDialog from "./_components/CreateUserDialog";
import UsersFiltersImportCard from "./_components/UsersFiltersImportCard";
import UsersTableCard from "./_components/UsersTableCard";

export default function AdminUsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"1" | "0" | "all">("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
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
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok || !data?.ok) {
        console.error("API ERROR RAW:", text);
        setImportErr(data?.message ?? `HTTP ${res.status}`);
        return;
      }

      if (dryRun) {
        setImportPreview(data);
        setImportMsg(
          `ตรวจสอบผ่าน: ทั้งหมด ${data.total} แถว | จะสร้างใหม่ ${data.wouldCreate} | จะอัปเดต ${data.wouldUpdate}`
        );
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

        <CreateUserDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          busy={busy}
          role={role}
          onRoleChange={setRole}
          birthDate={birthDate}
          onBirthDateChange={setBirthDate}
          firstName={firstName}
          onFirstNameChange={setFirstName}
          lastName={lastName}
          onLastNameChange={setLastName}
          studentId={studentId}
          onStudentIdChange={setStudentId}
          email={email}
          onEmailChange={setEmail}
          major={major}
          onMajorChange={setMajor}
          gender={gender}
          onGenderChange={setGender}
          studentType={studentType}
          onStudentTypeChange={setStudentType}
          onCreate={createUser}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <UsersFiltersImportCard
        q={q}
        active={active}
        busy={busy}
        onQChange={setQ}
        onActiveChange={setActive}
        onRefresh={load}
        csvFile={csvFile}
        importBusy={importBusy}
        importPreview={importPreview}
        importMsg={importMsg}
        importErr={importErr}
        onFileChange={(f) => {
          setCsvFile(f);
          setImportPreview(null);
          setImportMsg(null);
          setImportErr(null);
        }}
        onDryRun={() => runImport(true)}
        onImport={() => runImport(false)}
      />

      <UsersTableCard items={items} busy={busy} onDeactivate={deactivateUser} onToggleActive={toggleActiveInline} />
    </div>
  );
}
