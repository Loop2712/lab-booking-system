import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";

export type CreateReservationPayload = {
  roomId: string;
  date: string;
  slotIds: string[];
  approverId?: string;
  note?: string;
  participantIds?: string[];
};

export type CreateReservationResponse = {
  ok: boolean;
  statusLabel?: string;
  nextAction?: string;
  message?: string;
};

export async function createReservation(payload: CreateReservationPayload): Promise<CreateReservationResponse> {
  const data = await fetchJson<CreateReservationResponse>("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertOk(data, "จองไม่สำเร็จ กรุณาลองใหม่");
  return data;
}
