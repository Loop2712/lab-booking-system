"use client";

import type { Gender, Role, StudentType, UserRow } from "./types";
import { fetchUsers, createUser as createUserService, deleteUser, updateUser, importUsers } from "@/lib/services/users";
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

  async function load() {
    setError(null);
    try {
      const list = await fetchUsers({ q: q.trim() || undefined, active });
      setItems(list);
    } catch (e: unknown) {
      setError((e as Error)?.message || "โหลด users ไม่สำเร็จ");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, active]);

  async function runImport(dryRun: boolean) {
    if (!csvFile) {
      setImportErr("กรุณาเลือกไฟล์ CSV");
      return;
    }
    setImportBusy(true);
    setImportMsg(null);
    setImportErr(null);
    try {
      const data = await importUsers(csvFile, dryRun);
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
    } catch (e: unknown) {
      setImportPreview(null);
      setImportErr((e as Error)?.message || "เกิดข้อผิดพลาด");
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
    try {
      await createUserService({
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        studentId: role === "STUDENT" ? studentId.trim() : null,
        email: role === "STUDENT" ? null : email.trim(),
        major: major.trim() ? major.trim() : null,
        gender: gender || null,
        studentType: studentType || null,
      });
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
    } catch (e: unknown) {
      setError((e as Error)?.message || "สร้าง user ไม่สำเร็จ");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deactivateUser(id: string) {
    setError(null);
    setBusy(true);
    try {
      await deleteUser(id);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || "ปิดบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActiveInline(u: UserRow) {
    setError(null);
    setBusy(true);
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || "อัปเดต isActive ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
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
