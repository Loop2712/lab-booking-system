export type SectionItem = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  course: { code: string; name: string };
  room: { code: string; name: string; roomNumber?: string | null };
  teacher: { firstName: string; lastName: string; email?: string | null };
};
