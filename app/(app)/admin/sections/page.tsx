"use client";
import type { Course, Room, Section, User } from "./types";
import { TIME_SLOTS } from "@/lib/reserve/slots";
import { addDaysYmd, todayYmdBkk } from "@/lib/date";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const KEEP_SLOT = "KEEP";


export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);

  // create section form
  const [courseId, setCourseId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const [dayOfWeek, setDayOfWeek] = useState<(typeof DOW)[number]>("MON");
  const [slotId, setSlotId] = useState(TIME_SLOTS[0]?.id ?? "08:00-12:00");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCourseId, setEditCourseId] = useState<string>("");
  const [editTeacherId, setEditTeacherId] = useState<string>("");
  const [editRoomId, setEditRoomId] = useState<string>("");
  const [editDayOfWeek, setEditDayOfWeek] = useState<(typeof DOW)[number]>("MON");
  const [editSlotId, setEditSlotId] = useState(TIME_SLOTS[0]?.id ?? "08:00-12:00");
  const [editTerm, setEditTerm] = useState("");
  const [editYear, setEditYear] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTerm, setBulkTerm] = useState("");
  const [bulkClearTerm, setBulkClearTerm] = useState(false);
  const [bulkSlotId, setBulkSlotId] = useState<string>(KEEP_SLOT);
  const [bulkLoading, setBulkLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [fTerm, setFTerm] = useState("");
  const [fYear, setFYear] = useState("");
  const [fTeacher, setFTeacher] = useState<string>("ALL");
  const [fRoom, setFRoom] = useState<string>("ALL");

  // range (used by generate range / delete / regenerate)
  const [from, setFrom] = useState(() => todayYmdBkk());
  const [to, setTo] = useState(() => todayYmdBkk());
  const minRangeYmd = useMemo(() => todayYmdBkk(), []);
  const maxRangeYmd = useMemo(() => addDaysYmd(minRangeYmd, 365), [minRangeYmd]);

  async function load() {
    const [a, b, c, d] = await Promise.all([
      fetch("/api/admin/sections").then((r) => r.json()),
      fetch("/api/admin/courses").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]);

    setSections(a.items ?? []);
    setCourses(b.items ?? []);
    setRooms(c.rooms ?? []);

    const allUser: User[] = d.users ?? [];
    setTeachers(allUser.filter((u) => u.role === "TEACHER"));
  }

  useEffect(() => {
    load();
  }, []);

  // set defaults once data arrives
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courses, courseId]);

  useEffect(() => {
    if (!roomId && rooms.length) setRoomId(rooms[0].id);
  }, [rooms, roomId]);

  useEffect(() => {
    if (!teacherId && teachers.length) setTeacherId(teachers[0].id);
  }, [teachers, teacherId]);

  const canCreate = useMemo(() => !!courseId && !!teacherId && !!roomId, [courseId, teacherId, roomId]);
  const canEdit = useMemo(() => !!editId && !!editCourseId && !!editTeacherId && !!editRoomId, [editId, editCourseId, editTeacherId, editRoomId]);

  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (fTerm && (s.term ?? "") !== fTerm) return false;
      if (fYear && String(s.year ?? "") !== fYear) return false;
      if (fTeacher !== "ALL" && s.teacher.id !== fTeacher) return false;
      if (fRoom !== "ALL" && s.room.id !== fRoom) return false;

      if (q.trim()) {
        const hay =
          `${s.course.code} ${s.course.name} ${s.room.code} ${s.room.name} ${s.teacher.firstName} ${s.teacher.lastName} ${s.term ?? ""} ${s.year ?? ""}`
            .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [sections, q, fTerm, fYear, fTeacher, fRoom]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const allVisibleSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id)),
    [visibleIds, selectedSet]
  );
  const selectedSections = useMemo(
    () => sections.filter((s) => selectedSet.has(s.id)),
    [sections, selectedSet]
  );

  async function create() {
    if (!canCreate) return;

    const slot = TIME_SLOTS.find((s) => s.id === slotId);
    if (!slot) {
      alert("ช่วงเวลาไม่ถูกต้อง");
      return;
    }

    const yearValue = year.trim();
    if (yearValue && !/^\d{4}$/.test(yearValue)) {
      alert("ปีการศึกษาไม่ถูกต้อง (ตัวอย่าง: 2025)");
      return;
    }

    const r = await fetch("/api/admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        teacherId,
        roomId,
        dayOfWeek,
        startTime: slot.start,
        endTime: slot.end,
        term: term.trim() || undefined,
        year: yearValue ? Number(yearValue) : undefined,
      }),
    });

    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await load();
    setOpenCreate(false);
  }

  async function generate(sectionId: string) {
    const r = await fetch(`/api/admin/sections/${sectionId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    alert(`สร้างรายการสำเร็จ: ${j.created} รายการ`);
    await load();
  }

  async function deleteGenerated(sectionId: string) {
    if (!confirm(`ลบรายการจองแบบเรียนในชั้น (IN_CLASS) ในช่วง ${from} ถึง ${to} ใช่ไหม?`)) return;
    const r = await fetch(
      `/api/admin/sections/${sectionId}/generated?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { method: "DELETE" }
    );
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    alert(`ลบรายการสำเร็จ: ${j.deleted} รายการ`);
    await load();
  }

  async function regenerate(sectionId: string) {
    if (!confirm(`สร้างใหม่ในช่วง ${from} ถึง ${to} ใช่ไหม? (ระบบจะลบของเดิมแล้วสร้างใหม่)`)) return;
    const r = await fetch(`/api/admin/sections/${sectionId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    alert(`สร้างใหม่สำเร็จ: ลบ ${j.deleted} รายการ | สร้าง ${j.created} รายการ`);
    await load();
  }

  const courseLabel = (c: Course) => `${c.code} — ${c.name}`;
  const roomLabel = (r: Room) => `${r.code}${r.roomNumber ? ` (${r.roomNumber})` : ""} — ${r.name}`;
  const teacherLabel = (t: User) => `${t.firstName} ${t.lastName}${t.email ? ` (${t.email})` : ""}`;

  function openEditDialog(section: Section) {
    const slotKey = `${section.startTime}-${section.endTime}`;
    const slotMatch = TIME_SLOTS.find((s) => s.id === slotKey);
    setEditId(section.id);
    setEditCourseId(section.course.id);
    setEditTeacherId(section.teacher.id);
    setEditRoomId(section.room.id);
    setEditDayOfWeek(section.dayOfWeek as any);
    setEditSlotId(slotMatch?.id ?? slotKey);
    setEditTerm(section.term ?? "");
    setEditYear(section.year ? String(section.year) : "");
    setOpenEdit(true);
  }

  async function updateSection() {
    if (!canEdit || !editId) return;

    const slot = TIME_SLOTS.find((s) => s.id === editSlotId);
    if (!slot) {
      alert("ช่วงเวลาไม่ถูกต้อง");
      return;
    }

    const yearValue = editYear.trim();
    if (yearValue && !/^\d{4}$/.test(yearValue)) {
      alert("ปีการศึกษาไม่ถูกต้อง (ตัวอย่าง: 2025)");
      return;
    }

    const r = await fetch(`/api/admin/sections/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: editCourseId,
        teacherId: editTeacherId,
        roomId: editRoomId,
        dayOfWeek: editDayOfWeek,
        startTime: slot.start,
        endTime: slot.end,
        term: editTerm.trim() || undefined,
        year: yearValue ? Number(yearValue) : undefined,
      }),
    });

    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await load();
    setOpenEdit(false);
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => set.delete(id));
      } else {
        visibleIds.forEach((id) => set.add(id));
      }
      return Array.from(set);
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  async function applyBulkUpdate() {
    if (selectedSections.length === 0) return;

    const hasTermChange = bulkClearTerm || bulkTerm.trim().length > 0;
    const hasSlotChange = bulkSlotId !== KEEP_SLOT;

    if (!hasTermChange && !hasSlotChange) {
      alert("กรุณาเลือกเทอมหรือช่วงเวลาเพื่อแก้ไข");
      return;
    }

    const slot = hasSlotChange ? TIME_SLOTS.find((s) => s.id === bulkSlotId) : null;
    if (hasSlotChange && !slot) {
      alert("ช่วงเวลาไม่ถูกต้อง");
      return;
    }

    setBulkLoading(true);
    try {
      const results = await Promise.all(
        selectedSections.map(async (section) => {
          const termValue = bulkClearTerm
            ? null
            : bulkTerm.trim()
            ? bulkTerm.trim()
            : section.term ?? null;
          const startTime = slot?.start ?? section.startTime;
          const endTime = slot?.end ?? section.endTime;

          const res = await fetch(`/api/admin/sections/${section.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseId: section.course.id,
              teacherId: section.teacher.id,
              roomId: section.room.id,
              dayOfWeek: section.dayOfWeek,
              startTime,
              endTime,
              term: termValue,
              year: section.year ?? null,
            }),
          });

          const json = await res.json().catch(() => ({}));
          return { ok: res.ok && json?.ok, message: json?.message };
        })
      );

      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        alert(`อัปเดตไม่สำเร็จ ${failed.length} รายการ`);
      } else {
        alert("อัปเดตสำเร็จ");
      }

      await load();
      setSelectedIds([]);
      setBulkTerm("");
      setBulkClearTerm(false);
      setBulkSlotId(KEEP_SLOT);
    } catch (e: any) {
      alert(e?.message || "ERROR");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sections</h1>
          <p className="text-sm text-muted-foreground">สร้างและจัดการตารางเรียน</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>สร้าง Section</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>สร้าง Section</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Course */}
              <div className="space-y-2">
                <div className="text-sm">Course</div>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {courseLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground break-all">id: {courseId || "-"}</div>
              </div>

              {/* Teacher */}
              <div className="space-y-2">
                <div className="text-sm">Teacher</div>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอาจารย์" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {teacherLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground break-all">id: {teacherId || "-"}</div>
              </div>

              {/* Room */}
              <div className="space-y-2">
                <div className="text-sm">Room</div>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {roomLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground break-all">id: {roomId || "-"}</div>
              </div>

              {/* Day */}
              <div className="space-y-2">
                <div className="text-sm">Day of week</div>
                <Select value={dayOfWeek} onValueChange={(v) => setDayOfWeek(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวัน" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOW.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Slot */}
              <div className="space-y-2">
                <div className="text-sm">Time slot (4 hours)</div>
                <Select value={slotId} onValueChange={setSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกช่วงเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Term / Year */}
              <div className="space-y-2">
                <div className="text-sm">Term</div>
                <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="เช่น 1 / 2 / SUMMER" />
              </div>

              <div className="space-y-2">
                <div className="text-sm">Year</div>
                <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="เช่น 2025" inputMode="numeric" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              หมายเหตุ: หากตัวเลือกว่าง ให้ไปเพิ่มข้อมูลที่ /admin/courses, /admin/rooms และ /admin/users ก่อน
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                ยกเลิก
              </Button>
              <Button onClick={create} disabled={!canCreate}>
                สร้าง Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={openEdit}
          onOpenChange={(open) => {
            setOpenEdit(open);
            if (!open) setEditId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>แก้ไข Section</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm">Course</div>
                <Select value={editCourseId} onValueChange={setEditCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {courseLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Teacher</div>
                <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอาจารย์" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {teacherLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Room</div>
                <Select value={editRoomId} onValueChange={setEditRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {roomLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Day of week</div>
                <Select value={editDayOfWeek} onValueChange={(v) => setEditDayOfWeek(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวัน" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOW.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Time slot (4 hours)</div>
                <Select value={editSlotId} onValueChange={setEditSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกช่วงเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm">Term</div>
                <Input value={editTerm} onChange={(e) => setEditTerm(e.target.value)} placeholder="เช่น 1 / 2 / SUMMER" />
              </div>

              <div className="space-y-2">
                <div className="text-sm">Year</div>
                <Input value={editYear} onChange={(e) => setEditYear(e.target.value)} placeholder="เช่น 2025" inputMode="numeric" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                ยกเลิก
              </Button>
              <Button onClick={updateSection} disabled={!canEdit}>
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Range */}
      <Card>
        <CardHeader>
          <CardTitle>สร้าง/ลบตารางเรียน (IN_CLASS)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div className="space-y-2">
            <div className="text-sm">วันที่เริ่ม (YYYY-MM-DD)</div>
            <Input
              type="date"
              value={from}
              min={minRangeYmd}
              max={maxRangeYmd}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm">วันที่เริ่ม (YYYY-MM-DD)</div>
            <Input
              type="date"
              value={to}
              min={minRangeYmd}
              max={maxRangeYmd}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground pb-1">
            ช่วงวันที่ที่อนุญาต: {minRangeYmd} ถึง {maxRangeYmd}
          </div>
        </CardContent>
      </Card>

      {/* กลุ่มเรียน list */}
      <Card>
        <CardHeader>
          <CardTitle>รายการ Section</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search / Filter */}
          <div className="grid gap-2 md:grid-cols-5">
            <Input placeholder="Search (code/name/room/teacher)..." value={q} onChange={(e) => setQ(e.target.value)} />

            <Input placeholder="Term (เช่น 1/2)" value={fTerm} onChange={(e) => setFTerm(e.target.value)} />

            <Input placeholder="Year (เช่น 2025)" value={fYear} onChange={(e) => setFYear(e.target.value)} />

            <Select value={fTeacher} onValueChange={setFTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All teachers</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fRoom} onValueChange={setFRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All rooms</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold">แก้ไขหลายรายการ</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                เลือกแล้ว {selectedIds.length} รายการ
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0}
                >
                  ล้างการเลือก
                </Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                placeholder="แก้เทอม (ว่าง = ไม่เปลี่ยน)"
                value={bulkTerm}
                onChange={(e) => setBulkTerm(e.target.value)}
                disabled={bulkClearTerm}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={bulkClearTerm}
                  onChange={(e) => setBulkClearTerm(e.target.checked)}
                />
                ล้างค่าเทอม
              </label>
              <Select value={bulkSlotId} onValueChange={setBulkSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder="ไม่เปลี่ยนเวลา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_SLOT}>ไม่เปลี่ยนเวลา</SelectItem>
                  {TIME_SLOTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={applyBulkUpdate}
                disabled={selectedSections.length === 0 || bulkLoading}
              >
                {bulkLoading ? "กำลังบันทึก..." : "บันทึกหลายรายการ"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              จะปรับเฉพาะเทอมหรือช่วงเวลา (เวลาเริ่ม-สิ้นสุด) ให้รายการที่เลือกเท่านั้น
            </div>
          </div>

          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>วิชา</TableHead>
                  <TableHead>วัน/เวลา</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>อาจารย์</TableHead>
                  <TableHead>เทอม/ปี</TableHead>
                  <TableHead>นักศึกษา/จอง</TableHead>
                  <TableHead className="min-w-[240px]">แอคชั่น</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedSet.has(s.id)}
                          onChange={() => toggleSelectOne(s.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.course.code} {s.course.name}
                      </TableCell>
                      <TableCell>
                        {s.dayOfWeek} {s.startTime}-{s.endTime}
                      </TableCell>
                      <TableCell>{s.room.code}</TableCell>
                      <TableCell>
                        {s.teacher.firstName} {s.teacher.lastName}
                      </TableCell>
                      <TableCell>
                        {s.term ?? "-"} / {s.year ?? "-"}
                      </TableCell>
                      <TableCell>
                        {s._count.enrollments} / {s._count.reservations}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(s)}>
                            แก้ไข
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => generate(s.id)}>
                            สร้างตารางเรียน
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteGenerated(s.id)}>
                            ลบตารางเรียน
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => regenerate(s.id)}>
                            สร้างใหม่
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      ยังไม่มีข้อมูล Section
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
