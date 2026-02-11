"use client";

import type { Course, Room, User } from "../types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DayOption = {
  value: string;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  editCourseId: string;
  onEditCourseIdChange: (value: string) => void;
  editTeacherId: string;
  onEditTeacherIdChange: (value: string) => void;
  editRoomId: string;
  onEditRoomIdChange: (value: string) => void;
  editDayOfWeek: string;
  onEditDayOfWeekChange: (value: string) => void;
  editStartTime: string;
  onEditStartTimeChange: (value: string) => void;
  editEndTime: string;
  onEditEndTimeChange: (value: string) => void;
  editTermLabel: string;
  courses: Course[];
  activeTeachers: User[];
  activeRooms: Room[];
  dayOptions: DayOption[];
  onSave: () => Promise<void>;
  teacherLabel: (teacher: User) => string;
  roomLabel: (room: Room) => string;
  courseLabel: (course: Course) => string;
};

export default function EditSectionDialog({
  open,
  onOpenChange,
  canEdit,
  editCourseId,
  onEditCourseIdChange,
  editTeacherId,
  onEditTeacherIdChange,
  editRoomId,
  onEditRoomIdChange,
  editDayOfWeek,
  onEditDayOfWeekChange,
  editStartTime,
  onEditStartTimeChange,
  editEndTime,
  onEditEndTimeChange,
  editTermLabel,
  courses,
  activeTeachers,
  activeRooms,
  dayOptions,
  onSave,
  courseLabel,
  teacherLabel,
  roomLabel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไข Section</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm">วิชา</div>
            <Select value={editCourseId} onValueChange={onEditCourseIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกวิชา" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {courseLabel(course)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">อาจารย์</div>
            <Select value={editTeacherId} onValueChange={onEditTeacherIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกอาจารย์" />
              </SelectTrigger>
              <SelectContent>
                {activeTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacherLabel(teacher)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">ห้อง</div>
            <Select value={editRoomId} onValueChange={onEditRoomIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {activeRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {roomLabel(room)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">วันเรียน</div>
            <Select value={editDayOfWeek} onValueChange={onEditDayOfWeekChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกวัน" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">เวลาเริ่มต้น</div>
            <Input type="time" value={editStartTime} onChange={(e) => onEditStartTimeChange(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="text-sm">เวลาสิ้นสุด</div>
            <Input type="time" value={editEndTime} onChange={(e) => onEditEndTimeChange(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-sm">เทอม (ล็อกตามนำเข้า)</div>
            <Input value={editTermLabel} readOnly />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={onSave} disabled={!canEdit}>
            บันทึกการแก้ไข
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
