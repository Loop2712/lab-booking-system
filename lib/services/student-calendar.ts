import type { StudentCalendarApiResponse } from "@/lib/reservations/types";
import { fetchJson } from "@/lib/http/fetch-json";

export async function fetchStudentCalendar(from: string, to: string): Promise<StudentCalendarApiResponse> {
  const url = `/api/student/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return fetchJson<StudentCalendarApiResponse>(url);
}

