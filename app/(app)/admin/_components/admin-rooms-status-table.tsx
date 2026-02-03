"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimelineBooking, TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";
import { cn } from "@/lib/utils";

type Payload = {
  ok: boolean;
  date: string;
  rooms: TimelineRoomRow[];
};

type RoomStatusRow = TimelineRoomRow & {
  activeBooking: TimelineBooking | null;
};

function getActiveBooking(room: TimelineRoomRow) {
  const seen = new Set<string>();
  for (const slot of room.slots) {
    const booking = slot.booking;
    if (!booking) continue;
    if (seen.has(booking.reservationId)) continue;
    seen.add(booking.reservationId);
    if (booking.status === "CHECKED_IN") return booking;
  }
  return null;
}

function formatUsage(booking: TimelineBooking | null) {
  if (!booking) return "";
  if (booking.type === "IN_CLASS") {
    return booking.courseLabel || "ตารางเรียน";
  }
  const note = (booking.note ?? "").trim();
  return note || "";
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

  const rooms = useMemo<RoomStatusRow[]>(() => {
    if (!data?.rooms) return [];
    const kw = q.trim().toLowerCase();
    return data.rooms
      .filter((r) => {
        if (!kw) return true;
        const hay = `${r.code} ${r.name} ${r.roomNumber} ${r.floor}`.toLowerCase();
        return hay.includes(kw);
      })
      .map((room) => ({
        ...room,
        activeBooking: getActiveBooking(room),
      }));
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
                ว่าง
              </div>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm bg-rose-600/90" />
                ไม่ว่าง
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
                <TableHead className="min-w-[240px] text-xs font-semibold text-muted-foreground">
                  ห้อง
                </TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold text-muted-foreground">
                  ผู้ยืม
                </TableHead>
                <TableHead className="min-w-[260px] text-xs font-semibold text-muted-foreground">
                  การใช้งาน
                </TableHead>
                <TableHead className="min-w-[140px] text-xs font-semibold text-muted-foreground">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length ? (
                rooms.map((room, idx) => {
                  const isBusy = !!room.activeBooking;
                  const borrower =
                    room.activeBooking?.borrowerLabel ??
                    room.activeBooking?.requesterLabel ??
                    (room.activeBooking ? "รอผู้ยืม" : "-");
                  return (
                    <TableRow
                      key={room.id}
                      className={cn(
                        "border-border/60",
                        idx % 2 === 0 ? "bg-white" : "bg-muted/20",
                        "hover:bg-muted/30"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>
                            {room.code} • {room.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ห้อง {room.roomNumber} (ชั้น {room.floor})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{borrower}</TableCell>
                      <TableCell className="text-sm">{formatUsage(room.activeBooking)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "h-8 px-3 text-[12px] font-semibold",
                            isBusy ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                          )}
                        >
                          {isBusy ? "ไม่ว่าง" : "ว่าง"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
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


