"use client";
import type { Course, Room, Section, User } from "./types";
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
const TIME_FORMAT = /^\d{2}:\d{2}$/;

function toMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isValidTime(value: string) {
  if (!TIME_FORMAT.test(value)) return false;
  const [h, m] = value.split(":").map((n) => Number(n));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}


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
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCourseId, setEditCourseId] = useState<string>("");
  const [editTeacherId, setEditTeacherId] = useState<string>("");
  const [editRoomId, setEditRoomId] = useState<string>("");
  const [editDayOfWeek, setEditDayOfWeek] = useState<(typeof DOW)[number]>("MON");
  const [editStartTime, setEditStartTime] = useState("08:00");
  const [editEndTime, setEditEndTime] = useState("12:00");
  const [editTerm, setEditTerm] = useState("");
  const [editYear, setEditYear] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkTerm, setBulkTerm] = useState("");
  const [bulkClearTerm, setBulkClearTerm] = useState(false);
  const [bulkStartTime, setBulkStartTime] = useState<string>("");
  const [bulkEndTime, setBulkEndTime] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkScheduleLoading, setBulkScheduleLoading] = useState<null | "generate" | "delete" | "regenerate">(null);

  // filters
  const [q, setQ] = useState("");
  const [fTerm, setFTerm] = useState("");
  const [fYear, setFYear] = useState("");
  const [fTeacher, setFTeacher] = useState<string>("ALL");
  const [fRoom, setFRoom] = useState<string>("ALL");

  const activeRooms = useMemo(() => rooms.filter((r) => r.isActive !== false), [rooms]);
  const activeTeachers = useMemo(() => teachers.filter((t) => t.isActive !== false), [teachers]);

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
    setTeachers(allUser.filter((u) => u.role === "TEACHER" && u.isActive !== false));
  }

  useEffect(() => {
    load();
  }, []);

  // set defaults once data arrives
  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courses, courseId]);

  useEffect(() => {
    if (!roomId && activeRooms.length) setRoomId(activeRooms[0].id);
  }, [activeRooms, roomId]);

  useEffect(() => {
    if (!teacherId && activeTeachers.length) setTeacherId(activeTeachers[0].id);
  }, [activeTeachers, teacherId]);

  const canCreate = useMemo(
    () => !!courseId && !!teacherId && !!roomId && !!startTime && !!endTime,
    [courseId, teacherId, roomId, startTime, endTime]
  );
  const canEdit = useMemo(
    () => !!editId && !!editCourseId && !!editTeacherId && !!editRoomId && !!editStartTime && !!editEndTime,
    [editId, editCourseId, editTeacherId, editRoomId, editStartTime, editEndTime]
  );

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

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      alert("รูปแบบเวลาไม่ถูกต้อง");
      return;
    }
    if (toMinutes(endTime) <= toMinutes(startTime)) {
      alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
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
        startTime,
        endTime,
        term: term.trim() || undefined,
        year: yearValue ? Number(yearValue) : undefined,
      }),
    });

    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await load();
    setOpenCreate(false);
  }

  const courseLabel = (c: Course) => `${c.code} — ${c.name}`;
  const roomLabel = (r: Room) => `${r.code}${r.roomNumber ? ` (${r.roomNumber})` : ""} — ${r.name}`;
  const teacherLabel = (t: User) => `${t.firstName} ${t.lastName}${t.email ? ` (${t.email})` : ""}`;

  function openEditDialog(section: Section) {
    setEditId(section.id);
    setEditCourseId(section.course.id);
    const teacherIdValue = activeTeachers.some((t) => t.id === section.teacher.id) ? section.teacher.id : "";
    const roomIdValue = activeRooms.some((r) => r.id === section.room.id) ? section.room.id : "";
    setEditTeacherId(teacherIdValue);
    setEditRoomId(roomIdValue);
    setEditDayOfWeek(section.dayOfWeek as any);
    setEditStartTime(section.startTime);
    setEditEndTime(section.endTime);
    setEditTerm(section.term ?? "");
    setEditYear(section.year ? String(section.year) : "");
    setOpenEdit(true);
  }

  async function updateSection() {
    if (!canEdit || !editId) return;

    if (!isValidTime(editStartTime) || !isValidTime(editEndTime)) {
      alert("รูปแบบเวลาไม่ถูกต้อง");
      return;
    }
    if (toMinutes(editEndTime) <= toMinutes(editStartTime)) {
      alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
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
        startTime: editStartTime,
        endTime: editEndTime,
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
    const hasTimeChange = bulkStartTime.trim().length > 0 || bulkEndTime.trim().length > 0;

    if (!hasTermChange && !hasTimeChange) {
      alert("กรุณาเลือกเทอมหรือเวลาเพื่อแก้ไข");
      return;
    }

    if (hasTimeChange) {
      if (!bulkStartTime || !bulkEndTime) {
        alert("กรุณากรอกเวลาเริ่มต้นและเวลาสิ้นสุดให้ครบ");
        return;
      }
      if (!isValidTime(bulkStartTime) || !isValidTime(bulkEndTime)) {
        alert("รูปแบบเวลาไม่ถูกต้อง");
        return;
      }
      if (toMinutes(bulkEndTime) <= toMinutes(bulkStartTime)) {
        alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
        return;
      }
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
          const startTime = hasTimeChange ? bulkStartTime : section.startTime;
          const endTime = hasTimeChange ? bulkEndTime : section.endTime;

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
      setBulkStartTime("");
      setBulkEndTime("");
    } catch (e: any) {
      alert(e?.message || "ERROR");
    } finally {
      setBulkLoading(false);
    }
  }

  async function applyBulkSchedule(action: "generate" | "delete" | "regenerate") {
    if (selectedSections.length === 0) {
      alert("กรุณาเลือก Section ก่อน");
      return;
    }
    if (to < from) {
      alert("วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
      return;
    }

    const label =
      action === "generate"
        ? "สร้างตารางเรียน"
        : action === "delete"
        ? "ลบตารางเรียน"
        : "สร้างใหม่";
    if (!confirm(`${label} สำหรับ ${selectedSections.length} วิชา ในช่วง ${from} ถึง ${to} ใช่หรือไม่?`)) {
      return;
    }

    setBulkScheduleLoading(action);
    try {
      const results = await Promise.all(
        selectedSections.map(async (section) => {
          if (action === "delete") {
            const res = await fetch(
              `/api/admin/sections/${section.id}/generated?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
              { method: "DELETE" }
            );
            const json = await res.json().catch(() => ({}));
            return { ok: res.ok && json?.ok, deleted: json?.deleted ?? 0 };
          }

          const res = await fetch(`/api/admin/sections/${section.id}/${action === "generate" ? "generate" : "regenerate"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, to }),
          });
          const json = await res.json().catch(() => ({}));
          return {
            ok: res.ok && json?.ok,
            created: json?.created ?? 0,
            deleted: json?.deleted ?? 0,
          };
        })
      );

      const failed = results.filter((r) => !r.ok).length;
      const created = results.reduce((sum, r) => sum + (r.created ?? 0), 0);
      const deleted = results.reduce((sum, r) => sum + (r.deleted ?? 0), 0);
      if (failed) {
        alert(`ทำรายการไม่สำเร็จ ${failed} รายการ`);
      } else {
        if (action === "delete") {
          alert(`ลบตารางเรียนสำเร็จ: ${deleted} รายการ`);
        } else if (action === "generate") {
          alert(`สร้างตารางเรียนสำเร็จ: ${created} รายการ`);
        } else {
          alert(`สร้างใหม่สำเร็จ: ลบ ${deleted} รายการ | สร้าง ${created} รายการ`);
        }
      }

      await load();
    } catch (e: any) {
      alert(e?.message || "ERROR");
    } finally {
      setBulkScheduleLoading(null);
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
                    {activeTeachers.map((t) => (
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
                    {activeRooms.map((r) => (
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

              {/* Time */}
              <div className="space-y-2">
                <div className="text-sm">เวลาเริ่มต้น</div>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm">เวลาสิ้นสุด</div>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
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
                    {activeTeachers.map((t) => (
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
                    {activeRooms.map((r) => (
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
                <div className="text-sm">เวลาเริ่มต้น</div>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm">เวลาสิ้นสุด</div>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />
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

      {/* Bulk tools */}
      <Card>
        <CardHeader>
          <CardTitle>จัดการหลายรายการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              เลือกแล้ว {selectedIds.length} รายการ
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0}
              >
                ล้างการเลือก
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selectedSections.length !== 1}
                onClick={() => {
                  if (selectedSections.length === 1) {
                    openEditDialog(selectedSections[0]);
                  }
                }}
              >
                แก้ไขรายการที่เลือก
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">แก้ไขหลายรายการ</div>
            <div className="grid gap-2 md:grid-cols-5">
              <Input
                placeholder="เทอม (ว่าง = ไม่เปลี่ยน)"
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
              <Input
                type="time"
                value={bulkStartTime}
                onChange={(e) => setBulkStartTime(e.target.value)}
                placeholder="เวลาเริ่มต้น"
              />
              <Input
                type="time"
                value={bulkEndTime}
                onChange={(e) => setBulkEndTime(e.target.value)}
                placeholder="เวลาสิ้นสุด"
              />
              <Button
                type="button"
                onClick={applyBulkUpdate}
                disabled={selectedSections.length === 0 || bulkLoading}
              >
                {bulkLoading ? "กำลังบันทึก..." : "บันทึกหลายรายการ"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              ปรับเฉพาะเทอม/เวลาให้รายการที่เลือก
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">สร้าง/ลบตารางเรียน (IN_CLASS)</div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm">วันที่เริ่ม</div>
                <Input
                  type="date"
                  value={from}
                  min={minRangeYmd}
                  max={maxRangeYmd}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm">วันที่สิ้นสุด</div>
                <Input
                  type="date"
                  value={to}
                  min={minRangeYmd}
                  max={maxRangeYmd}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground self-end">
                ช่วงวันที่ที่อนุญาต: {minRangeYmd} ถึง {maxRangeYmd}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={selectedSections.length === 0 || bulkScheduleLoading !== null}
                onClick={() => applyBulkSchedule("generate")}
              >
                {bulkScheduleLoading === "generate" ? "กำลังสร้าง..." : "สร้างตารางเรียนที่เลือก"}
              </Button>
              <Button
                variant="outline"
                disabled={selectedSections.length === 0 || bulkScheduleLoading !== null}
                onClick={() => applyBulkSchedule("delete")}
              >
                {bulkScheduleLoading === "delete" ? "กำลังลบ..." : "ลบตารางเรียนที่เลือก"}
              </Button>
              <Button
                variant="destructive"
                disabled={selectedSections.length === 0 || bulkScheduleLoading !== null}
                onClick={() => applyBulkSchedule("regenerate")}
              >
                {bulkScheduleLoading === "regenerate" ? "กำลังสร้างใหม่..." : "สร้างใหม่ที่เลือก"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              เลือก Section จากตารางด้านล่างก่อนใช้งาน
            </div>
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
                {activeTeachers.map((t) => (
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
                {activeRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TableHead>นักศึกษา (สูงสุด 40)</TableHead>
                  <TableHead className="w-[120px]">แก้ไข</TableHead>
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
                        {s._count.enrollments}/40
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(s)}>
                          แก้ไข
                        </Button>
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

