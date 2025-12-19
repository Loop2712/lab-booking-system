"use client";

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

type Course = { id: string; code: string; name: string };
type Room = { id: string; code: string; name: string; roomNumber?: string | null };
type User = { id: string; firstName: string; lastName: string; email?: string | null; role?: string };

type Section = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  term?: string | null;
  year?: number | null;
  isActive: boolean;
  course: Course;
  room: Room;
  teacher: User;
  _count: { enrollments: number; reservations: number };
};

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function plusDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);

  const [courseId, setCourseId] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const [dayOfWeek, setDayOfWeek] = useState<(typeof DOW)[number]>("MON");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState<string>("");

  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(plusDaysStr(30));

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

 
  const allUsers: User[] = d.users ?? [];
  setTeachers(allUsers.filter((u) => u.role === "TEACHER"));
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
    alert(`Generated: ${j.created}`);
    await load();
  }

  const courseLabel = (c: Course) => `${c.code} — ${c.name}`;
  const roomLabel = (r: Room) => `${r.code}${r.roomNumber ? ` (${r.roomNumber})` : ""} — ${r.name}`;
  const teacherLabel = (t: User) => `${t.firstName} ${t.lastName}${t.email ? ` (${t.email})` : ""}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Section (ตารางสอนรายสัปดาห์)</CardTitle>
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
            หมายเหตุ: ถ้าไม่มีข้อมูลใน dropdown ให้ไปสร้างข้อมูลก่อนที่ /admin/courses /admin/rooms /admin/users
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate IN_CLASS Reservations</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-end">
          <div className="space-y-2">
            <div className="text-sm">From (YYYY-MM-DD)</div>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm">To (YYYY-MM-DD)</div>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className="border rounded-md p-3 space-y-1">
              <div className="font-medium">
                {s.course.code} {s.course.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {s.dayOfWeek} {s.startTime}-{s.endTime} | Room: {s.room.code} | Teacher: {s.teacher.firstName}{" "}
                {s.teacher.lastName}
              </div>
              <div className="text-sm text-muted-foreground">
                enrollments: {s._count.enrollments} | generated reservations: {s._count.reservations}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => generate(s.id)}>Generate</Button>
              </div>

              <div className="text-xs text-muted-foreground break-all">id: {s.id}</div>
            </div>
          ))}
          {sections.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มี section</div>}
        </CardContent>
      </Card>
    </div>
  );
}
