export type TimeSlot = {
  id: string;     // เก็บลง DB (unique)
  label: string;  // แสดงผล
  start: string;  // HH:mm
  end: string;    // HH:mm
};

export const TIME_SLOTS: TimeSlot[] = [
  { id: "08:00-12:00", label: "08:00 - 12:00", start: "08:00", end: "12:00" },
  { id: "12:00-16:00", label: "12:00 - 16:00", start: "12:00", end: "16:00" },
  { id: "16:00-20:00", label: "16:00 - 20:00", start: "16:00", end: "20:00" },
];

export function findSlot(slotId: string) {
  return TIME_SLOTS.find((s) => s.id === slotId) ?? null;
}
