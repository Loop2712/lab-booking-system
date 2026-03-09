import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";

export type ReservationRow = {
  id: string;
  type: string;
  status: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  room: { code: string; name: string; roomNumber: string; floor: number };
  requester: { firstName: string; lastName: string; studentId?: string | null; email?: string | null };
  approver?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  loan?: {
    id: string;
    createdAt: string;
    updatedAt: string;
    borrower?: { firstName: string; lastName: string; studentId?: string | null; email?: string | null } | null;
  } | null;
};

export type QueueResponse = {
  ok: boolean;
  pendingCheckin?: ReservationRow[];
  activeLoans?: ReservationRow[];
};

export type LookupResult = {
  ok: true;
  mode: "CHECKIN" | "RETURN";
  user: { firstName: string; lastName: string; studentId?: string | null; email?: string | null };
  reservation: {
    id: string;
    type: string;
    status: string;
    slot: string;
    startAt: string;
    endAt: string;
    room: { code: string; name: string; roomNumber: string; floor: number };
  };
  candidatesCount: number;
};

export async function fetchLoansQueue(): Promise<QueueResponse> {
  const data = await fetchJson<QueueResponse>("/api/loans/queue", { cache: "no-store" });
  assertOk(data, "โหลดข้อมูลไม่สำเร็จ");
  return data;
}

export async function checkIn(reservationId: string, userToken: string): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>("/api/loans/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId, userToken }),
  });
  assertOk(data, "เช็คอินไม่สำเร็จ");
}

export async function returnKey(reservationId: string, userToken: string): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>("/api/loans/return", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId, userToken }),
  });
  assertOk(data, "คืนกุญแจไม่สำเร็จ");
}

export async function lookupReservation(userToken: string): Promise<LookupResult> {
  const data = await fetchJson<LookupResult | { ok: false; message?: string }>("/api/loans/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userToken }),
  });
  assertOk(data, "ค้นหาไม่สำเร็จ");
  return data as LookupResult;
}
