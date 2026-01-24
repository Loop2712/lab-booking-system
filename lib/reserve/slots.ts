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

export function getSlotIndex(slotId: string) {
  return TIME_SLOTS.findIndex((s) => s.id === slotId);
}

export function getNextSlotId(slotId: string) {
  const idx = getSlotIndex(slotId);
  if (idx < 0 || idx >= TIME_SLOTS.length - 1) return null;
  return TIME_SLOTS[idx + 1]?.id ?? null;
}

export function areConsecutiveSlots(slotIds: string[]) {
  if (slotIds.length <= 1) return true;
  const indexes = slotIds.map(getSlotIndex);
  if (indexes.some((idx) => idx < 0)) return false;
  const sorted = [...indexes].sort((a, b) => a - b);
  return sorted.every((idx, i) => (i === 0 ? true : idx === sorted[i - 1] + 1));
}
