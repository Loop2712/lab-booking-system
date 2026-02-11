"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RoomItem = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
};

type RangeItem = {
  reservationId: string;
  type: "IN_CLASS" | "AD_HOC";
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "NO_SHOW"
    | "CHECKED_IN"
    | "COMPLETED";
  slot: string;
  startAt: string;
  endAt: string;
  requesterLabel?: string | null;
  borrowerLabel?: string | null;
  courseLabel?: string | null;
};

type RangeResult = {
  room: RoomItem;
  from: string;
  to: string;
  items: RangeItem[];
};

function ymdInBkk(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysBkk(ymd: string, days: number) {
  const base = new Date(`${ymd}T00:00:00.000+07:00`);
  base.setUTCDate(base.getUTCDate() + days);
  return ymdInBkk(base);
}

function buildDateRange(from: string, to: string) {
  const dates: string[] = [];
  const start = new Date(`${from}T00:00:00.000+07:00`);
  const end = new Date(`${to}T00:00:00.000+07:00`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(ymdInBkk(d));
  }
  return dates;
}

function formatYmdThai(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000+07:00`);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function bookingTitle(item: RangeItem) {
  if (item.courseLabel) return item.courseLabel;
  return item.type === "AD_HOC" ? "จองนอกตาราง" : "ตารางเรียน";
}

export default function RoomAvailability({ rooms }: { rooms: RoomItem[] }) {
  const today = useMemo(() => ymdInBkk(new Date()), []);
  const [roomId, setRoomId] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(addDaysBkk(today, 7));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RangeResult | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === roomId) ?? null,
    [rooms, roomId]
  );

  const dates = useMemo(() => {
    if (!result) return [];
    return buildDateRange(result.from, result.to);
  }, [result]);

  const bookingMap = useMemo(() => {
    const map: Record<string, RangeItem[]> = {};
    if (!result) return map;
    const sorted = [...result.items].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    for (const item of sorted) {
      const dateKey = ymdInBkk(new Date(item.startAt));
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    }
    return map;
  }, [result]);

  const freeDates = useMemo(() => {
    if (!result) return [];
    return dates.filter((date) => (bookingMap?.[date]?.length ?? 0) === 0);
  }, [dates, bookingMap, result]);

  async function search() {
    if (!roomId || !fromDate || !toDate) {
      setError("กรุณาเลือกห้องและช่วงวันที่ให้ครบ");
      return;
    }
    if (toDate < fromDate) {
      setError("ช่วงวันที่ไม่ถูกต้อง");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/rooms/range?roomId=${encodeURIComponent(roomId)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message || "ค้นหาตารางห้องไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setResult({
        room: json.room,
        from: json.from,
        to: json.to,
        items: Array.isArray(json.items) ? json.items : [],
      });
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4 space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold">ตารางห้องและวันว่าง</div>
          <div className="text-xs text-muted-foreground">
            เลือกห้องและช่วงวันที่เพื่อดูสถานะการจองแบบรายวัน
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="space-y-2">
            <Label>ห้อง</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code} • {room.roomNumber} (ชั้น {room.floor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>จากวันที่</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>ถึงวันที่</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <Button onClick={search} disabled={!roomId || !fromDate || !toDate || loading}>
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!result && !loading ? (
        <div className="text-sm text-muted-foreground">
          เลือกห้องและช่วงวันที่ แล้วกด “ค้นหา” เพื่อดูตารางห้อง
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">ผลการค้นหา</Badge>
            <div className="text-muted-foreground">
              {selectedRoom
                ? `${selectedRoom.code} • ${selectedRoom.roomNumber} (ชั้น ${selectedRoom.floor})`
                : result.room?.code}
              {" • "}
              {formatYmdThai(result.from)} - {formatYmdThai(result.to)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">วันว่างทั้งหมด (ทุกช่วงเวลา)</div>
            {freeDates.length ? (
              <div className="flex flex-wrap gap-2">
                {freeDates.map((date) => (
                  <Badge key={date} variant="outline">
                    {formatYmdThai(date)}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">ไม่มีวันว่างทั้งวันในช่วงนี้</div>
            )}
          </div>

          <div className="rounded-2xl border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">วันที่</TableHead>
                  <TableHead className="min-w-[260px]">รายการจอง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dates.length ? (
                  dates.map((date) => (
                    <TableRow key={date}>
                      <TableCell className="font-medium">
                        {formatYmdThai(date)}
                      </TableCell>
                      <TableCell>
                        {bookingMap?.[date]?.length ? (
                          <div className="space-y-2">
                            {bookingMap[date].map((item) => (
                              <div key={item.reservationId} className="rounded-md border p-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      item.type === "IN_CLASS"
                                        ? "bg-emerald-600/90"
                                        : "bg-rose-600/90"
                                    )}
                                  >
                                    {item.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeRange(item.startAt, item.endAt)}
                                  </span>
                                </div>
                                <div className="text-xs font-medium">
                                  {bookingTitle(item)}
                                </div>
                                {item.requesterLabel ? (
                                  <div className="text-xs text-muted-foreground">
                                    {item.requesterLabel}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-700 font-medium">ว่าง</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-sm text-muted-foreground">
                      ไม่พบข้อมูลในช่วงที่เลือก
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatTimeRange(startIso: string, endIso: string) {
  try {
    const s = new Date(startIso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const e = new Date(endIso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return `${s} - ${e}`;
  } catch {
    return `${startIso} - ${endIso}`;
  }
}
