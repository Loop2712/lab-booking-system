"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  requesterLabel: string | null;
  borrowerLabel?: string | null;
  courseLabel?: string | null;
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

type RoomState = "available" | "in_use" | "late_pickup" | "pending";

function getRoomState(booking: Booking | null): RoomState {
  if (!booking || FINISHED_STATUSES.includes(booking.status)) return "available";
  if (booking.status === "CHECKED_IN") return "in_use";
  if (booking.status === "PENDING") return "pending";
  return "late_pickup";
}

function roomStateLabel(state: RoomState) {
  if (state === "in_use") return "กำลังใช้งาน";
  if (state === "late_pickup") return "ถึงเวลา/ยังไม่มารับกุญแจ";
  if (state === "pending") return "รออนุมัติ";
  return "ว่าง";
}

function roomStateClass(state: RoomState) {
  if (state === "available") return "border-emerald-700 bg-emerald-700 text-white";
  if (state === "in_use") return "border-rose-700 bg-rose-700 text-white";
  if (state === "late_pickup") return "border-amber-700 bg-amber-700 text-white";
  return "border-slate-700 bg-slate-700 text-white";
}

export default function AdminRoomsStatusTable() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    const t = setInterval(load, 10_000);
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

  const slotLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of data?.slots ?? []) map.set(slot.id, slot.label);
    return map;
  }, [data?.slots]);

  function getActiveBooking(room: RoomRow, nowDate: Date) {
    const bookings = room.slots
      .map((s) => s.booking)
      .filter((b): b is Booking => !!b && !FINISHED_STATUSES.includes(b.status));
    const checkedIn = bookings.find((b) => b.status === "CHECKED_IN");
    if (checkedIn) {
      const slotLabel = slotLabelById.get(checkedIn.slot) ?? checkedIn.slot;
      return { booking: checkedIn, slotLabel };
    }

    const inWindow = bookings.find((b) => {
      const start = new Date(b.startAt);
      const end = new Date(b.endAt);
      return nowDate >= start && nowDate <= end;
    });

    if (!inWindow) return null;
    const slotLabel = slotLabelById.get(inWindow.slot) ?? inWindow.slot;
    return { booking: inWindow, slotLabel };
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>สถานะห้องแบบเรียลไทม์</CardTitle>
            <div className="text-xs text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
              className="max-w-xs bg-white"
            />
            <Button variant="outline" onClick={load}>
              รีเฟรช
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-xl border border-muted px-4 py-3 text-sm text-muted-foreground">
            กำลังโหลดข้อมูล...
          </div>
        ) : null}

        <div className="overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="min-w-[220px]">ห้อง</TableHead>
                <TableHead className="min-w-[200px]">ผู้ยืม</TableHead>
                <TableHead className="min-w-[140px] text-center">ช่วงเวลา</TableHead>
                <TableHead className="min-w-[220px]">วิชา</TableHead>
                <TableHead className="min-w-[160px] text-center">สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length ? (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{room.code} • {room.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ห้อง {room.roomNumber} (ชั้น {room.floor})
                        </div>
                      </div>
                    </TableCell>
                    {(() => {
                      const active = getActiveBooking(room, now);
                      const booking = active?.booking ?? null;
                      const state = getRoomState(booking);
                      const borrower =
                        booking && booking.status === "CHECKED_IN"
                          ? booking.borrowerLabel ?? booking.requesterLabel ?? "-"
                          : "-";
                      const course =
                        booking && booking.status === "CHECKED_IN"
                          ? booking.courseLabel ?? (booking.type === "AD_HOC" ? "จองทั่วไป" : "-")
                          : "-";

                      return (
                        <>
                          <TableCell className="text-sm">{borrower}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {active?.slotLabel ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">{course}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className={cn("justify-center", roomStateClass(state))}>
                              {roomStateLabel(state)}
                            </Badge>
                          </TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    ไม่พบข้อมูลห้อง
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
