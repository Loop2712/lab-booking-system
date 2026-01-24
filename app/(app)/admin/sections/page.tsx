"use client";
import type { Course, Room, Section, User } from "./types";
import { todayStr } from "./todayStr";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;


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

  // filters
  const [q, setQ] = useState("");
  const [fTerm, setFTerm] = useState("");
  const [fYear, setFYear] = useState("");
  const [fTeacher, setFTeacher] = useState<string>("ALL");
  const [fRoom, setFRoom] = useState<string>("ALL");

  // range (used by generate range / delete / regenerate)
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr()); // ✅ เอา default +30 วันออกแล้ว

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

  async function create() {
    if (!canCreate) return;

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
        term: term || undefined,
        year: year ? Number(year) : undefined,
      }),
    });

    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await load();
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

  return (
    <div className="space-y-6">
      {/* Create Section */}
      <Card>
        <CardHeader>
          <CardTitle>สร้าง Section</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
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

          {/* Time */}
          <div className="space-y-2">
            <div className="text-sm">Start time</div>
            <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="08:00" />
          </div>

          <div className="space-y-2">
            <div className="text-sm">End time</div>
            <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="12:00" />
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

          <div className="md:col-span-2 flex gap-2">
            <Button onClick={create} disabled={!canCreate}>
              Create Section
            </Button>
            <Button variant="secondary" onClick={load}>
              Refresh
            </Button>
          </div>

          <div className="md:col-span-2 text-sm text-muted-foreground">
            หมายเหตุ: หากตัวเลือกว่าง ให้ไปเพิ่มข้อมูลที่ /admin/courses, /admin/rooms และ /admin/users ก่อน
          </div>
        </CardContent>
      </Card>

      {/* Range */}
      <Card>
        <CardHeader>
          <CardTitle>สร้าง/ลบตารางเรียน (IN_CLASS)</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div className="space-y-2">
            <div className="text-sm">วันที่เริ่ม (YYYY-MM-DD)</div>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm">วันที่เริ่ม (YYYY-MM-DD)</div>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* กลุ่มเรียน list */}
      <Card>
        <CardHeader>
          <CardTitle>รายการ Section</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
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

          {/* List */}
          {filtered.map((s) => (
            <div key={s.id} className="border rounded-md p-3 space-y-1">
              <div className="font-medium">
                {s.course.code} {s.course.name}
              </div>

              <div className="text-sm text-muted-foreground">
                {s.dayOfWeek} {s.startTime}-{s.endTime} | Room: {s.room.code} | Teacher: {s.teacher.firstName} {s.teacher.lastName}
                {s.term ? ` | term: ${s.term}` : ""}{s.year ? ` | year: ${s.year}` : ""}
              </div>

              <div className="text-sm text-muted-foreground">
                Student: {s._count.enrollments} | List: {s._count.reservations}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" onClick={() => generate(s.id)}>สร้างตารางเรียน</Button>
                <Button variant="outline" onClick={() => deleteGenerated(s.id)}>ลบตารางเรียน</Button>
                <Button variant="destructive" onClick={() => regenerate(s.id)}>สร้างใหม่</Button>
              </div>

              <div className="text-xs text-muted-foreground break-all">id: {s.id}</div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">ยังไม่มีข้อมูล Section</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
