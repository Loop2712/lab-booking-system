import type { Room } from "./types";

type Params = {
  room: Room;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  refresh: () => Promise<void> | void;
};

export async function toggleRoomActive({ room, setBusy, setError, refresh }: Params) {
  setError(null);
  setBusy(true);
  const res = await fetch(`/api/admin/rooms/${room.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: !room.isActive }),
  });
  const json = await res.json().catch(() => ({}));
  setBusy(false);

  if (!res.ok || !json?.ok) {
    setError(json?.message || "อัปเดตไม่สำเร็จ");
    return;
  }
  await refresh();
}
