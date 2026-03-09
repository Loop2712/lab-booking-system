import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";
import type { AdminRoom } from "@/lib/types/rooms";

export type Course = { id: string; code: string; name: string };
export type Term = { id: string; term: string; year: number; startDate: string; endDate: string; isActive: boolean };
export type SectionRoom = { id: string; code: string; name: string; roomNumber?: string | null; isActive?: boolean };
export type SectionUser = { id: string; firstName: string; lastName: string; email?: string | null; role?: string; isActive?: boolean };
export type Section = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  termId?: string | null;
  term?: Term | null;
  isActive: boolean;
  course: Course;
  room: SectionRoom;
  teacher: SectionUser;
  _count: { enrollments: number; reservations: number };
};

export type AdminSectionsResponse = { ok: boolean; items?: Section[] };
export type AdminCoursesResponse = { ok: boolean; items?: Course[] };
export type AdminTermsResponse = { ok: boolean; items?: Term[] };

export async function fetchSections(): Promise<Section[]> {
  const data = await fetchJson<AdminSectionsResponse>("/api/admin/sections");
  assertOk(data, "โหลด sections ไม่สำเร็จ");
  return data.items ?? [];
}

export async function fetchCourses(): Promise<Course[]> {
  const data = await fetchJson<AdminCoursesResponse>("/api/admin/courses");
  assertOk(data, "โหลด courses ไม่สำเร็จ");
  return data.items ?? [];
}

export async function fetchAdminRoomsForSections(): Promise<AdminRoom[]> {
  const data = await fetchJson<{ ok: boolean; rooms?: AdminRoom[] }>("/api/admin/rooms");
  assertOk(data, "โหลด rooms ไม่สำเร็จ");
  return data.rooms ?? [];
}

export async function fetchAdminUsers(): Promise<{ id: string; firstName: string; lastName: string; email?: string | null; role?: string; isActive?: boolean }[]> {
  const data = await fetchJson<{ ok: boolean; users?: unknown[] }>("/api/admin/users");
  assertOk(data, "โหลด users ไม่สำเร็จ");
  return (data.users ?? []) as { id: string; firstName: string; lastName: string; email?: string | null; role?: string; isActive?: boolean }[];
}

export async function fetchTerms(): Promise<Term[]> {
  const data = await fetchJson<AdminTermsResponse>("/api/admin/terms");
  assertOk(data, "โหลด terms ไม่สำเร็จ");
  return data.items ?? [];
}
