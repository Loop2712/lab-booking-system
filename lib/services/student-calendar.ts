export type StudentCalendarResponse = {
  sections?: any[];
  reservations?: {
    adhoc?: any[];
    inClass?: any[];
  };
};

export async function fetchStudentCalendar(from: string, to: string) {
  const res = await fetch(`/api/student/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as StudentCalendarResponse) : null;

  if (!res.ok) {
    const message = (data as any)?.message ?? `HTTP ${res.status}`;
    const err = new Error(String(message));
    (err as any).detail = data;
    throw err;
  }

  return data ?? {};
}
