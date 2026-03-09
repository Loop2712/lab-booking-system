import { fetchJson } from "@/lib/http/fetch-json";
import { assertOk } from "@/lib/types/api";

export type KeyStatus = "AVAILABLE" | "BORROWED" | "LOST" | "DAMAGED";

export type KeyRow = {
  id: string;
  keyCode: string;
  status: KeyStatus;
  roomId: string;
  room?: { code: string; name: string };
  currentHolder?: {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

export async function fetchKeys(): Promise<KeyRow[]> {
  const data = await fetchJson<{ ok: boolean; keys?: KeyRow[]; message?: string }>("/api/admin/keys", {
    cache: "no-store",
  });
  assertOk(data, "โหลดกุญแจไม่สำเร็จ");
  return data.keys ?? [];
}

export async function createKey(payload: { keyCode: string; roomId: string; status: KeyStatus }): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>("/api/admin/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assertOk(data, "เพิ่มกุญแจไม่สำเร็จ");
}

export async function updateKeyStatus(keyId: string, status: KeyStatus): Promise<void> {
  const data = await fetchJson<{ ok: boolean; message?: string }>(`/api/admin/keys/${keyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  assertOk(data, "อัปเดตไม่สำเร็จ");
}
