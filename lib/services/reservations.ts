import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";
import type { MyReservationItem, MyReservationsResponse } from "@/lib/types/reservations";

export async function fetchMyReservations(): Promise<MyReservationItem[]> {
  const data = await fetchJson<MyReservationsResponse>("/api/reservations/my", { cache: "no-store" });
  assertOk(data, "โหลดรายการไม่สำเร็จ กรุณาลองใหม่");
  return data.items ?? [];
}

export async function cancelReservation(id: string): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>(`/api/reservations/${id}/cancel`, {
    method: "POST",
  });
  assertOk(data, "ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
}
