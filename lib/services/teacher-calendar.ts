import { fetchJson } from "@/lib/http/fetch-json";
import { fetchRooms } from "@/lib/services/rooms";

export { fetchRooms } from "@/lib/services/rooms";

export type TeacherCalendarResponse = {
  reservations?: { inClass?: unknown[] };
};

export async function fetchTeacherCalendar(from: string, to: string): Promise<TeacherCalendarResponse> {
  const url = `/api/teacher/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return fetchJson<TeacherCalendarResponse>(url);
}

export async function createTeacherReservation(payload: {
  roomId: string;
  date: string;
  slotId: string;
  note: string;
}) {
  const data = await fetchJson<{ ok: boolean; message?: string }>("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!data.ok) {
    const err = new Error(data.message ?? "สร้างการจองไม่สำเร็จ");
    (err as any).detail = data;
    throw err;
  }
  return data;
}
