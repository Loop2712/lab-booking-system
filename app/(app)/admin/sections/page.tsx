"use client";
import type { Course, Room, Section, User, Term } from "./types";
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
} from "@/components/ui/dialog";

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
  const [terms, setTerms] = useState<Term[]>([]);

  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCourseId, setEditCourseId] = useState<string>("");
  const [editTeacherId, setEditTeacherId] = useState<string>("");
  const [editRoomId, setEditRoomId] = useState<string>("");
  const [editDayOfWeek, setEditDayOfWeek] = useState<string>("MON");
  const [editStartTime, setEditStartTime] = useState("08:00");
  const [editEndTime, setEditEndTime] = useState("12:00");
  const [editTermLabel, setEditTermLabel] = useState<string>("-");

  // filters
  const [q, setQ] = useState("");
  const [fTermId, setFTermId] = useState("ALL");
  const [fTeacher, setFTeacher] = useState<string>("ALL");
  const [fRoom, setFRoom] = useState<string>("ALL");

  const activeRooms = useMemo(() => rooms.filter((r) => r.isActive !== false), [rooms]);
  const activeTeachers = useMemo(() => teachers.filter((t) => t.isActive !== false), [teachers]);

  async function load() {
    const [a, b, c, d, e] = await Promise.all([
      fetch("/api/admin/sections").then((r) => r.json()),
      fetch("/api/admin/courses").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/terms").then((r) => r.json()),
    ]);

    setSections(a.items ?? []);
    setCourses(b.items ?? []);
    setRooms(c.rooms ?? []);
    setTerms(e.items ?? []);

    const allUser: User[] = d.users ?? [];
    setTeachers(allUser.filter((u) => u.role === "TEACHER" && u.isActive !== false));
  }

  useEffect(() => {
    load();
  }, []);

  const canEdit = useMemo(
    () => !!editId && !!editCourseId && !!editTeacherId && !!editRoomId && !!editStartTime && !!editEndTime,
    [editId, editCourseId, editTeacherId, editRoomId, editStartTime, editEndTime]
  );

  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (!s.isActive) return false;
      if (fTermId !== "ALL") {
        if (fTermId === "NONE" && s.termId) return false;
        if (fTermId !== "NONE" && s.termId !== fTermId) return false;
      }
      if (fTeacher !== "ALL" && s.teacher.id !== fTeacher) return false;
      if (fRoom !== "ALL" && s.room.id !== fRoom) return false;

      if (q.trim()) {
        const hay =
          `${s.course.code} ${s.course.name} ${s.room.code} ${s.room.name} ${s.teacher.firstName} ${s.teacher.lastName} ${s.term?.term ?? ""} ${s.term?.year ?? ""}`
            .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [sections, q, fTermId, fTeacher, fRoom]);

  const courseLabel = (c: Course) => `${c.code} — ${c.name}`;
  const roomLabel = (r: Room) => `${r.code}${r.roomNumber ? ` (${r.roomNumber})` : ""} — ${r.name}`;
  const teacherLabel = (t: User) => `${t.firstName} ${t.lastName}${t.email ? ` (${t.email})` : ""}`;
  const termLabel = (t: Term) => `${t.term} / ${t.year}`;

  function openEditDialog(section: Section) {
    setEditId(section.id);
    setEditCourseId(section.course.id);
    const teacherIdValue = activeTeachers.some((t) => t.id === section.teacher.id) ? section.teacher.id : "";
    const roomIdValue = activeRooms.some((r) => r.id === section.room.id) ? section.room.id : "";
    setEditTeacherId(teacherIdValue);
    setEditRoomId(roomIdValue);
    setEditDayOfWeek(section.dayOfWeek);
    setEditStartTime(section.startTime);
    setEditEndTime(section.endTime);
    setEditTermLabel(section.term ? termLabel(section.term) : "-");
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

    const r = await fetch(`/api/admin/sections/${editId}` , {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: editCourseId,
        teacherId: editTeacherId,
        roomId: editRoomId,
        dayOfWeek: editDayOfWeek,
        startTime: editStartTime,
        endTime: editEndTime,
      }),
    });

    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await load();
    setOpenEdit(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sections</h1>
          <p className="text-sm text-muted-foreground">
            แก้ไขได้เฉพาะรายวิชา/อาจารย์/ห้อง/เวลา (เทอมล็อกตามนำเข้า)
          </p>
        </div>
      </div>

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
              <Input value={editDayOfWeek} readOnly />
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

            <div className="space-y-2 md:col-span-2">
              <div className="text-sm">Term (ล็อกตามนำเข้า)</div>
              <Input value={editTermLabel} readOnly />
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

      {/* รายการ Section */}
      <Card>
        <CardHeader>
          <CardTitle>รายการ Section (เฉพาะที่ Active)</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search / Filter */}
          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Search (code/name/room/teacher)..." value={q} onChange={(e) => setQ(e.target.value)} />

            <Select value={fTermId} onValueChange={setFTermId}>
              <SelectTrigger>
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกเทอม</SelectItem>
                <SelectItem value="NONE">ไม่มีเทอม</SelectItem>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {termLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                      <TableCell>{s.term ? termLabel(s.term) : "-"}</TableCell>
                      <TableCell>{s._count.enrollments}/40</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(s)}>
                          แก้ไข
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
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
