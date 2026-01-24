import type { Room } from "./types";

type Params = {
  setRooms: (rooms: Room[]) => void;
  setError: (message: string | null) => void;
};

export async function loadRooms({ setRooms, setError }: Params) {
  setError(null);
  const res = await fetch("/api/admin/rooms", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    setError(json?.message || "โหลดห้องไม่สำเร็จ");
    return;
  }
  setRooms(json.rooms ?? []);
}
