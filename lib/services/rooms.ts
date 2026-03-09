import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";
import type { AdminRoom, AdminRoomCreatePayload, RoomsAvailabilityResponse } from "@/lib/types/rooms";

export type RoomBasic = {
  id: string;
  roomNumber: string;
  floor: number;
  computerCount: number;
};

export async function fetchRooms(): Promise<RoomBasic[]> {
  const data = await fetchJson<{ ok: boolean; rooms?: RoomBasic[]; message?: string }>("/api/rooms");
  assertOk(data, "Failed to load rooms");
  return data.rooms ?? [];
}

export async function fetchAdminRooms(): Promise<AdminRoom[]> {
  const data = await fetchJson<{ ok: boolean; rooms?: AdminRoom[]; message?: string }>("/api/admin/rooms", {
    cache: "no-store",
  });
  assertOk(data, "โหลดห้องไม่สำเร็จ");
  return data.rooms ?? [];
}

export async function fetchRoomsAvailability(roomId: string, date: string): Promise<RoomsAvailabilityResponse> {
  const url = `/api/rooms/availability?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(date)}`;
  const data = await fetchJson<RoomsAvailabilityResponse & { ok?: boolean; message?: string }>(url);
  assertOk(data, "โหลดช่วงเวลาว่างไม่สำเร็จ");
  return data;
}

export async function createRoom(payload: AdminRoomCreatePayload): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>("/api/admin/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertOk(data, "เพิ่มห้องไม่สำเร็จ");
}

export type RoomsImportPreview = {
  ok: boolean;
  total?: number;
  wouldCreate?: number;
  wouldUpdate?: number;
  created?: number;
  updated?: number;
  message?: string;
};

export type RoomsTodayPayload = {
  ok: boolean;
  date: string;
  rooms: Array<{
    id: string;
    code: string;
    name: string;
    roomNumber: string;
    floor: number;
    slots: Array<{ slotId: string; label: string; booking: unknown }>;
  }>;
};

export async function fetchRoomsToday(date?: string): Promise<RoomsTodayPayload> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await fetchJson<RoomsTodayPayload>(`/api/rooms/today${qs}`, { cache: "no-store" });
  assertOk(data, "โหลดข้อมูลไม่สำเร็จ");
  return data;
}

export async function importRooms(file: File, dryRun: boolean): Promise<RoomsImportPreview> {
  const fd = new FormData();
  fd.append("file", file);
  const data = await fetchJson<RoomsImportPreview>(
    `/api/admin/rooms/import?dryRun=${dryRun ? "1" : "0"}`,
    { method: "POST", body: fd }
  );
  assertOk(data, data?.message ?? "นำเข้าไม่สำเร็จ");
  return data;
}
