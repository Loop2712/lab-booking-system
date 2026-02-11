"use client";

import type { Room, Term, User } from "../types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  q: string;
  onQChange: (value: string) => void;
  termId: string;
  onTermIdChange: (value: string) => void;
  teacherId: string;
  onTeacherIdChange: (value: string) => void;
  roomId: string;
  onRoomIdChange: (value: string) => void;
  terms: Term[];
  activeTeachers: User[];
  activeRooms: Room[];
  termLabel: (term: Term) => string;
};

export default function SectionsFilterBar({
  q,
  onQChange,
  termId,
  onTermIdChange,
  teacherId,
  onTeacherIdChange,
  roomId,
  onRoomIdChange,
  terms,
  activeTeachers,
  activeRooms,
  termLabel,
}: Props) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <Input
        placeholder="ค้นหา (รหัสวิชา/ชื่อวิชา/ห้อง/อาจารย์)"
        value={q}
        onChange={(e) => onQChange(e.target.value)}
      />

      <Select value={termId} onValueChange={onTermIdChange}>
        <SelectTrigger>
          <SelectValue placeholder="เทอม" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">ทุกเทอม</SelectItem>
          <SelectItem value="NONE">ไม่มีเทอม</SelectItem>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              {termLabel(term)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={teacherId} onValueChange={onTeacherIdChange}>
        <SelectTrigger>
          <SelectValue placeholder="อาจารย์" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">อาจารย์ทั้งหมด</SelectItem>
          {activeTeachers.map((teacher) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              {teacher.firstName} {teacher.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={roomId} onValueChange={onRoomIdChange}>
        <SelectTrigger>
          <SelectValue placeholder="ห้อง" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">ห้องทั้งหมด</SelectItem>
          {activeRooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.code} — {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
