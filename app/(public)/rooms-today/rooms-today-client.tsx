"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Slot = { id: string; label: string; start: string; end: string };

type Booking = {
  reservationId: string;
  slot: string;
  type: "IN_CLASS" | "AD_HOC";
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "NO_SHOW"
    | "CHECKED_IN"
    | "COMPLETED";
  requesterLabel: string;
  startAt: string;
  endAt: string;
};

type RoomRow = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  slots: { slotId: string; label: string; booking: Booking | null }[];
};

type Payload = {
  ok: boolean;
  date: string;
  slots: Slot[];
  rooms: RoomRow[];
};

const FINISHED_STATUSES: Booking["status"][] = ["COMPLETED", "NO_SHOW", "CANCELLED", "REJECTED"];

type SlotState = "available" | "in_use" | "late_pickup";

function getSlotState(booking: Booking | null, now: Date): SlotState {
  if (!booking || FINISHED_STATUSES.includes(booking.status)) return "available";
  if (booking.status === "CHECKED_IN") return "in_use";

  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const inWindow = now >= start && now <= end;
  if (inWindow) return "late_pickup";
  return "available";
}

function slotStateLabel(state: SlotState, booking: Booking | null) {
  if (state === "available") {
    if (booking && !FINISHED_STATUSES.includes(booking.status)) return "จองแล้ว";
    return "ว่าง";
  }
  if (state === "in_use") return "กำลังใช้งาน";
  return "ถึงเวลา/ยังไม่มารับกุญแจ";
}

function slotStateClass(state: SlotState) {
  if (state === "in_use") return "bg-rose-100 border-rose-200 text-rose-900";
  if (state === "late_pickup") return "bg-amber-100 border-amber-200 text-amber-900";
  return "bg-emerald-100 border-emerald-200 text-emerald-900";
}

export default function RoomsTodayClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [q, setQ] = useState("");
  const now = lastUpdated ?? new Date();

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/rooms/today", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Payload;
      if (!res.ok || !json?.ok) {
        setError((json as any)?.message || "โหลดข้อมูลไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setData(json);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // ✅ realtime แบบ polling
    return () => clearInterval(t);
  }, [load]);

  const rooms = useMemo(() => {
    if (!data?.rooms) return [];
    const kw = q.trim().toLowerCase();
    if (!kw) return data.rooms;
    return data.rooms.filter((r) => {
      const hay = `${r.code} ${r.name} ${r.roomNumber} ${r.floor}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [data, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
            className="max-w-xs bg-white/90"
          />
          <Button variant="outline" onClick={load}>
            รีเฟรช
          </Button>
        </div>

        <div className="text-xs text-black/70">
          {data?.date ? (
            <>
              วันที่: <span className="font-semibold">{data.date}</span>
              {lastUpdated ? (
                <>
                  {" "}
                  • อัปเดตล่าสุด:{" "}
                  <span className="font-semibold">
                    {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">เกิดข้อผิดพลาด</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading && !data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">กำลังโหลด...</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            RoomBooking
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold text-[#6ABE75]">
                  {room.code} • {room.name} • {room.roomNumber} (ชั้น {room.floor})
                </div>
                <div className="text-xs text-black/60">ตารางห้องเรียนและการจองวันนี้</div>
              </div>
              <div className="text-xs text-black/60">slots: {room.slots.length}</div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {room.slots.map((s) => {
                const b = s.booking;
                const state = getSlotState(b, now);
                return (
                  <div
                    key={s.slotId}
                    className={cn(
                      "rounded-xl border px-3 py-2 space-y-2 transition",
                      slotStateClass(state)
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{s.label}</span>
                      <span>{slotStateLabel(state, b)}</span>
                    </div>

                    {b ? (
                      <div className="text-xs text-black/80 space-y-1">
                        <div className="font-semibold text-black">
                          {b.type === "IN_CLASS" ? "ตารางเรียน" : "จองนอกตาราง"} • {b.requesterLabel}
                        </div>
                        <div className="font-mono">
                          {new Date(b.startAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(b.endAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-black/70">ไม่มีการจอง</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
