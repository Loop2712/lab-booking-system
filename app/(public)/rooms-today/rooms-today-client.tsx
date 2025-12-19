"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function statusBadgeVariant(status?: Booking["status"]) {
  if (!status) return "secondary";
  if (status === "CHECKED_IN") return "default";
  if (status === "APPROVED") return "outline";
  if (status === "PENDING") return "secondary";
  if (status === "COMPLETED") return "secondary";
  if (status === "NO_SHOW") return "destructive";
  return "secondary";
}

function statusLabel(status?: Booking["status"]) {
  if (!status) return "ว่าง";
  if (status === "PENDING") return "รออนุมัติ";
  if (status === "APPROVED") return "จองแล้ว";
  if (status === "CHECKED_IN") return "กำลังใช้งาน";
  if (status === "COMPLETED") return "จบแล้ว";
  if (status === "NO_SHOW") return "No-show";
  if (status === "CANCELLED") return "ยกเลิก";
  if (status === "REJECTED") return "ปฏิเสธ";
  return status;
}

export default function RoomsTodayClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [q, setQ] = useState("");

  async function load() {
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
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // ✅ realtime แบบ polling
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
            className="max-w-sm"
          />
          <Button variant="outline" onClick={load}>
            รีเฟรช
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {data?.date ? (
            <>
              วันที่: <span className="font-medium">{data.date}</span>
              {lastUpdated ? (
                <>
                  {" "}
                  • อัปเดตล่าสุด:{" "}
                  <span className="font-medium">
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
            กำลังดึงข้อมูลห้องและการจองของวันนี้
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {room.code} • {room.name} • {room.roomNumber} (ชั้น {room.floor})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-3">
              {room.slots.map((s) => {
                const b = s.booking;
                const isFree = !b || b.status === "COMPLETED" || b.status === "NO_SHOW";
                return (
                  <div
                    key={s.slotId}
                    className={cn(
                      "rounded-xl border p-3 space-y-2",
                      isFree ? "bg-background" : "bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{s.label}</div>
                      <Badge variant={statusBadgeVariant(b?.status)}>{statusLabel(b?.status)}</Badge>
                    </div>

                    {b ? (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="font-medium text-foreground/90">
                          {b.type === "IN_CLASS" ? "In-class" : "Ad-hoc"} • {b.requesterLabel}
                        </div>
                        <div className="font-mono">
                          {new Date(b.startAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(b.endAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="font-mono">#{b.reservationId}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">ไม่มีการจองในช่วงนี้</div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
