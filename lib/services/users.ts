import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";
import type { UserRow, UserSearchResult } from "@/lib/types/users";

type UsersListResponse = { ok: boolean; users?: UserRow[]; message?: string };
type UserSearchResponse = { ok: boolean; items?: UserSearchResult[]; message?: string };
type TeachersResponse = { ok: boolean; items?: { id: string; firstName: string; lastName: string; email?: string | null }[]; message?: string };

export async function fetchUsers(params: { q?: string; active?: "1" | "0" | "all" }): Promise<UserRow[]> {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.active) sp.set("active", params.active);
  const data = await fetchJson<UsersListResponse>(`/api/admin/users?${sp.toString()}`, { cache: "no-store" });
  assertOk(data, "โหลด users ไม่สำเร็จ");
  return data.users ?? [];
}

export async function createUser(payload: {
  role: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  studentId?: string | null;
  email?: string | null;
  major?: string | null;
  gender?: string | null;
  studentType?: string | null;
}): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string; detail?: unknown }>("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertOk(data, "สร้าง user ไม่สำเร็จ");
}

export async function updateUser(id: string, patch: { isActive?: boolean }): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  assertOk(data, "อัปเดต isActive ไม่สำเร็จ");
}

export async function deleteUser(id: string): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
  assertOk(data, "ปิดบัญชีไม่สำเร็จ");
}

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  if (q.trim().length < 2) return [];
  const data = await fetchJson<UserSearchResponse>(`/api/users/search?q=${encodeURIComponent(q)}`);
  assertOk(data, "ค้นหาผู้ร่วมใช้ไม่สำเร็จ");
  return data.items ?? [];
}

export async function fetchTeachers(limit = 200): Promise<TeachersResponse["items"]> {
  const data = await fetchJson<TeachersResponse>(`/api/teachers?limit=${limit}`, { cache: "no-store" });
  assertOk(data, "โหลดรายชื่ออาจารย์ผู้อนุมัติไม่สำเร็จ");
  return data.items ?? [];
}

export type ImportPreview = {
  ok: boolean;
  total?: number;
  wouldCreate?: number;
  wouldUpdate?: number;
  created?: number;
  updated?: number;
  message?: string;
};

export async function importUsers(file: File, dryRun: boolean): Promise<ImportPreview> {
  const fd = new FormData();
  fd.append("file", file);
  const data = await fetchJson<ImportPreview>(
    `/api/admin/users/import?dryRun=${dryRun ? "1" : "0"}`,
    { method: "POST", body: fd }
  );
  assertOk(data, data?.message ?? "นำเข้าไม่สำเร็จ");
  return data;
}
