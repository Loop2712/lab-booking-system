import { differenceInMinutes, format, isValid, parseISO } from "date-fns";

function toDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDateTime(value?: string | Date | null, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;
  return format(date, "yyyy-MM-dd HH:mm");
}

export function formatDate(value?: string | Date | null, fallback = "-") {
  const date = toDate(value);
  if (!date) return fallback;
  return format(date, "yyyy-MM-dd");
}

export function formatTimeRange(
  start?: string | Date | null,
  end?: string | Date | null
) {
  const startValue = formatDateTime(start, "");
  const endValue = formatDateTime(end, "");
  if (!startValue || !endValue) return "-";
  return `${startValue} - ${endValue}`;
}

export function formatDuration(
  start?: string | Date | null,
  end?: string | Date | null
) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return "-";
  const minutes = Math.max(0, differenceInMinutes(endDate, startDate));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0 && mins === 0) return "0m";
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatRoomLabel(room?: {
  roomNumber?: string | null;
  floor?: number | null;
}) {
  if (!room) return "-";
  const number = room.roomNumber ? `Room ${room.roomNumber}` : "";
  const floor = room.floor !== null && room.floor !== undefined ? `Floor ${room.floor}` : "";
  return [number, floor].filter(Boolean).join(" / ") || "-";
}

export function formatUserLabel(user?: {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  studentId?: string | null;
  email?: string | null;
}) {
  if (!user) return "-";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const role = user.role ?? "";
  const identity = user.studentId ?? user.email ?? "";
  const parts = [name || "Unknown", role, identity].filter(Boolean);
  return parts.join(" | ");
}
