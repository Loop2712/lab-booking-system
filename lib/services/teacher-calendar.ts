export async function fetchTeacherCalendar(from: string, to: string) {
  const res = await fetch(`/api/teacher/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.message ?? `HTTP ${res.status}`);
    (err as any).detail = data;
    throw err;
  }

  return data ?? {};
}

export async function fetchRooms() {
  const res = await fetch("/api/rooms");
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    const err = new Error(data?.message ?? "Failed to load rooms");
    (err as any).detail = data;
    throw err;
  }
  return data.rooms ?? [];
}

export async function createTeacherReservation(payload: {
  roomId: string;
  date: string;
  slotId: string;
  note: string;
}) {
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    const err = new Error(data?.message ?? "สร้างการจองไม่สำเร็จ");
    (err as any).detail = data;
    throw err;
  }
  return data;
}
