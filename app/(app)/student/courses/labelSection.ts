import type { SectionItem } from "./types";

export function labelSection(s: SectionItem) {
  const teacher = `${s.teacher.firstName} ${s.teacher.lastName}`;
  const room = `${s.room.code}${s.room.roomNumber ? ` (${s.room.roomNumber})` : ""}`;
  return `${s.course.code} — ${s.course.name} | ${s.dayOfWeek} ${s.startTime}-${s.endTime} | ${room} | ${teacher}`;
}
