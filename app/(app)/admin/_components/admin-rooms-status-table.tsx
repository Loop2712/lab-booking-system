"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const START_HOUR = 7;
const END_HOUR = 21; // exclusive
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesOfDay(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function bookingColor(booking: Booking) {
  return booking.type === "IN_CLASS"
    ? "bg-emerald-600/90 text-white"
    : "bg-rose-600/90 text-white";
}

function bookingLabel(booking: Booking) {
  if (booking.courseLabel) return booking.courseLabel;
  return booking.type === "AD_HOC" ? "จองนอกตาราง" : "-";
}

export default function AdminRoomsStatusTable() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm bg-emerald-600/90" />
                ตารางเรียน
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm bg-rose-600/90" />
                จองนอกตาราง
              </div>
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
                {HOURS.map((h) => (
                  <TableHead key={h} className="min-w-[90px] text-center">
                    {pad2(h)}:00
                  </TableHead>
                ))}
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
                      const rawBookings = room.slots
                        .map((s) => s.booking)
                        .filter((b): b is Booking => !!b);

                      const seen = new Set<string>();
                      const bookings = rawBookings.filter((b) => {
                        if (seen.has(b.reservationId)) return false;
                        seen.add(b.reservationId);
                        return true;
                      });

                      const ranges = bookings.map((b) => ({
                        booking: b,
                        startMin: minutesOfDay(b.startAt),
                        endMin: minutesOfDay(b.endAt),
                      }));

                      const cells: { booking: Booking | null; isStart: boolean }[] = [];

                      for (const h of HOURS) {
                        const cellStart = h * 60;
                        const cellEnd = (h + 1) * 60;
                        const hit = ranges.find(
                          (r) => r.startMin < cellEnd && r.endMin > cellStart
                        );
                        const booking = hit?.booking ?? null;
                        const prev = cells[cells.length - 1]?.booking ?? null;
                        const isStart = booking ? !prev || prev.reservationId !== booking.reservationId : false;
                        cells.push({ booking, isStart });
                      }

                      return cells.map((cell, idx) => (
                        <TableCell key={idx} className="p-0">
                          {cell.booking ? (
                            <div className={cn("h-16 px-2 py-1 text-[11px] leading-tight", bookingColor(cell.booking))}>
                              {cell.isStart ? (
                                <>
                                  <div className="font-medium truncate">{bookingLabel(cell.booking)}</div>
                                  {cell.booking.borrowerLabel ? (
                                    <div className="truncate">{cell.booking.borrowerLabel}</div>
                                  ) : null}
                                </>
                              ) : null}
                            </div>
                          ) : (
                            <div className="h-16 px-2 py-1 text-[11px] text-muted-foreground" />
                          )}
                        </TableCell>
                      ));
                    })()}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={HOURS.length + 1} className="text-center text-sm text-muted-foreground">
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
