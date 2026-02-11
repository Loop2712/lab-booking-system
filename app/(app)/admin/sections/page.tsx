"use client";

import type { Course, Room, Section, Term, User } from "./types";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditSectionDialog from "./_components/EditSectionDialog";
import SectionsFilterBar from "./_components/SectionsFilterBar";
import SectionsTable from "./_components/SectionsTable";

const TIME_FORMAT = /^\d{2}:\d{2}$/;

const DAY_OPTIONS = [
  { value: "MON", label: "วันจันทร์" },
  { value: "TUE", label: "วันอังคาร" },
  { value: "WED", label: "วันพุธ" },
  { value: "THU", label: "วันพฤหัสบดี" },
  { value: "FRI", label: "วันศุกร์" },
  { value: "SAT", label: "วันเสาร์" },
  { value: "SUN", label: "วันอาทิตย์" },
] as const;

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

  const [q, setQ] = useState("");
  const [fTermId, setFTermId] = useState("ALL");
  const [fTeacher, setFTeacher] = useState<string>("ALL");
  const [fRoom, setFRoom] = useState<string>("ALL");

  const activeRooms = useMemo(() => rooms.filter((r) => r.isActive !== false), [rooms]);
  const activeTeachers = useMemo(() => teachers.filter((t) => t.isActive !== false), [teachers]);

  async function load() {
    const [sectionsResponse, coursesResponse, roomsResponse, usersResponse, termsResponse] = await Promise.all([
      fetch("/api/admin/sections").then((r) => r.json()),
      fetch("/api/admin/courses").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/terms").then((r) => r.json()),
    ]);

    setSections(sectionsResponse.items ?? []);
    setCourses(coursesResponse.items ?? []);
    setRooms(roomsResponse.rooms ?? []);
    setTerms(termsResponse.items ?? []);

    const allUsers: User[] = usersResponse.users ?? [];
    setTeachers(allUsers.filter((u) => u.role === "TEACHER" && u.isActive !== false));
  }

  useEffect(() => {
    load();
  }, []);

  const canEdit = useMemo(
    () =>
      !!editId &&
      !!editCourseId &&
      !!editTeacherId &&
      !!editRoomId &&
      !!editDayOfWeek &&
      !!editStartTime &&
      !!editEndTime,
    [editId, editCourseId, editTeacherId, editRoomId, editDayOfWeek, editStartTime, editEndTime]
  );

  const filtered = useMemo(() => {
    return sections.filter((section) => {
      if (!section.isActive) return false;
      if (fTermId !== "ALL") {
        if (fTermId === "NONE" && section.termId) return false;
        if (fTermId !== "NONE" && section.termId !== fTermId) return false;
      }
      if (fTeacher !== "ALL" && section.teacher.id !== fTeacher) return false;
      if (fRoom !== "ALL" && section.room.id !== fRoom) return false;

      if (q.trim()) {
        const hay =
          `${section.course.code} ${section.course.name} ${section.room.code} ${section.room.name} ${section.teacher.firstName} ${section.teacher.lastName} ${section.term?.term ?? ""} ${section.term?.year ?? ""}`
            .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [sections, q, fTermId, fTeacher, fRoom]);

  const courseLabel = (course: Course) => `${course.code} — ${course.name}`;
  const roomLabel = (room: Room) => `${room.code}${room.roomNumber ? ` (${room.roomNumber})` : ""} — ${room.name}`;
  const teacherLabel = (teacher: User) =>
    `${teacher.firstName} ${teacher.lastName}${teacher.email ? ` (${teacher.email})` : ""}`;
  const termLabel = (term: Term) => `${term.term} / ${term.year}`;
  const dayLabel = (dayCode: string) => DAY_OPTIONS.find((day) => day.value === dayCode)?.label ?? dayCode;

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

    const res = await fetch(`/api/admin/sections/${editId}`, {
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

    const json = await res.json();
    if (!json.ok) {
      alert(json.message ?? "เกิดข้อผิดพลาด");
      return;
    }

    await load();
    setOpenEdit(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">จัดการ Section</h1>
          <p className="text-sm text-muted-foreground">แก้ไขรายวิชา อาจารย์ ห้อง วันเรียน และเวลา (เทอมล็อกตามไฟล์นำเข้า)</p>
        </div>
      </div>

      <EditSectionDialog
        open={openEdit}
        onOpenChange={(open) => {
          setOpenEdit(open);
          if (!open) setEditId(null);
        }}
        canEdit={canEdit}
        editCourseId={editCourseId}
        onEditCourseIdChange={setEditCourseId}
        editTeacherId={editTeacherId}
        onEditTeacherIdChange={setEditTeacherId}
        editRoomId={editRoomId}
        onEditRoomIdChange={setEditRoomId}
        editDayOfWeek={editDayOfWeek}
        onEditDayOfWeekChange={setEditDayOfWeek}
        editStartTime={editStartTime}
        onEditStartTimeChange={setEditStartTime}
        editEndTime={editEndTime}
        onEditEndTimeChange={setEditEndTime}
        editTermLabel={editTermLabel}
        courses={courses}
        activeTeachers={activeTeachers}
        activeRooms={activeRooms}
        dayOptions={DAY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
        onSave={updateSection}
        teacherLabel={teacherLabel}
        roomLabel={roomLabel}
        courseLabel={courseLabel}
      />

      <Card>
        <CardHeader>
          <CardTitle>รายการ Section (เฉพาะที่เปิดใช้งาน)</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <SectionsFilterBar
            q={q}
            onQChange={setQ}
            termId={fTermId}
            onTermIdChange={setFTermId}
            teacherId={fTeacher}
            onTeacherIdChange={setFTeacher}
            roomId={fRoom}
            onRoomIdChange={setFRoom}
            terms={terms}
            activeTeachers={activeTeachers}
            activeRooms={activeRooms}
            termLabel={termLabel}
          />

          <SectionsTable sections={filtered} onEdit={openEditDialog} termLabel={termLabel} dayLabel={dayLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
