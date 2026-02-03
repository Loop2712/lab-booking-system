"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoomsTimelineTable, { TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeItem = {
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
  requesterLabel?: string | null;
  borrowerLabel?: string | null;
  courseLabel?: string | null;
  startAt: string;
  endAt: string;
};

type Payload = {
  ok: boolean;
  date: string;
  rooms: TimelineRoomRow[];
};

export default function RoomsTodayClient() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [q, setQ] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(() => ymdBangkok());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeRoomId, setRangeRoomId] = useState<string>("");
  const [rangeFrom, setRangeFrom] = useState<string>(() => ymdBangkok());
  const [rangeTo, setRangeTo] = useState<string>(() => ymdBangkok());
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [rangeLoading, setRangeLoading] = useState<boolean>(false);
  const [rangeRoomLabel, setRangeRoomLabel] = useState<string | null>(null);
  const [rangeItems, setRangeItems] = useState<RangeItem[]>([]);

  const todayYmd = useMemo(() => ymdBangkok(), []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const qs = selectedDate ? `?date=${encodeURIComponent(selectedDate)}` : "";
      const res = await fetch(`/api/rooms/today${qs}`, { cache: "no-store" });
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
  }, [selectedDate]);

  useEffect(() => {
    load();
    if (selectedDate !== todayYmd) return;
    const t = setInterval(load, 10_000); // ✅ realtime แบบ polling (เฉพาะวันปัจจุบัน)
    return () => clearInterval(t);
  }, [load, selectedDate, todayYmd]);

  const rooms = useMemo(() => {
    if (!data?.rooms) return [];
    const kw = q.trim().toLowerCase();
    if (!kw) return data.rooms;
    return data.rooms.filter((r) => {
      const hay = `${r.code} ${r.name} ${r.roomNumber} ${r.floor}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [data, q]);

  function runRangeSearch() {
    setRangeError(null);
    if (!rangeRoomId) {
      setRangeError("กรุณาเลือกห้อง");
      return;
    }
    if (!rangeFrom || !rangeTo) {
      setRangeError("กรุณาเลือกช่วงวันที่");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rangeFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(rangeTo)) {
      setRangeError("รูปแบบวันที่ไม่ถูกต้อง");
      return;
    }
    if (rangeTo < rangeFrom) {
      setRangeError("วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
      return;
    }
    setRangeLoading(true);
    setRangeItems([]);
    const qs = new URLSearchParams({
      roomId: rangeRoomId,
      from: rangeFrom,
      to: rangeTo,
    });
    fetch(`/api/rooms/range?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) {
          setRangeError(j?.message || "ค้นหาไม่สำเร็จ");
          return;
        }
        setRangeItems(Array.isArray(j.items) ? j.items : []);
        const label = j?.room
          ? `${j.room.code} • ${j.room.roomNumber} • ชั้น ${j.room.floor}`
          : null;
        setRangeRoomLabel(label);
      })
      .catch((e) => {
        setRangeError(e?.message || "ค้นหาไม่สำเร็จ");
      })
      .finally(() => setRangeLoading(false));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
            className="max-w-xs bg-white/90"
          />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[170px] bg-white/90"
          />
          <Button variant="outline" onClick={() => setSelectedDate(addDaysYmd(selectedDate, -1))}>
            ก่อนหน้า
          </Button>
          <Button variant="secondary" onClick={() => setSelectedDate(todayYmd)}>
            วันนี้
          </Button>
          <Button variant="outline" onClick={() => setSelectedDate(addDaysYmd(selectedDate, 1))}>
            ถัดไป
          </Button>
          <Button variant="outline" onClick={() => setRangeOpen(true)}>
            ค้นหาแบบช่วงวันที่
          </Button>
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

      <div className="flex flex-wrap gap-2 text-xs text-black/70">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-600/90" />
          ตารางเรียน
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-rose-600/90" />
          จองนอกตาราง
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

      <Dialog
        open={rangeOpen}
        onOpenChange={(open) => {
          setRangeOpen(open);
          if (!open) {
            setRangeError(null);
            setRangeItems([]);
            setRangeRoomLabel(null);
          } else {
            setRangeFrom(selectedDate || ymdBangkok());
            setRangeTo(selectedDate || ymdBangkok());
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ค้นหาแบบช่วงวันที่</DialogTitle>
            <DialogDescription>
              เลือกห้องและช่วงวันที่เพื่อดูรายละเอียดการใช้งาน
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm">Room</div>
              <Select value={rangeRoomId} onValueChange={setRangeRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  {data?.rooms?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} • {r.roomNumber} • ชั้น {r.floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm">วันที่เริ่มต้น</div>
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm">วันที่สิ้นสุด</div>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </div>
            </div>

            {rangeError ? (
              <div className="text-sm text-destructive">{rangeError}</div>
            ) : null}

            {rangeLoading ? (
              <div className="text-sm text-muted-foreground">กำลังค้นหา...</div>
            ) : rangeRoomLabel ? (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-sm font-medium">
                  ผลการค้นหา: {rangeRoomLabel} ({rangeFrom} ถึง {rangeTo})
                </div>
                {rangeItems.length ? (
                  <div className="space-y-2">
                    {rangeItems.map((b) => (
                      <div key={b.reservationId} className="rounded-md border p-2 text-sm">
                        <div className="font-medium">
                          {b.courseLabel ?? (b.type === "AD_HOC" ? "จองนอกตาราง" : "ตารางเรียน")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(b.startAt)} • {formatTimeRange(b.startAt, b.endAt)}
                        </div>
                        <div className="text-xs">
                          ผู้ยืม: {b.borrowerLabel ?? "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ผู้จอง: {b.requesterLabel ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">ว่าง (ไม่มีการจองในช่วงเวลานี้)</div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRangeOpen(false)}>
              ปิด
            </Button>
            <Button onClick={runRangeSearch}>ค้นหา</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-auto rounded-lg border bg-white/90">
        <RoomsTimelineTable rooms={rooms} />
      </div>
    </div>
  );
}

function ymdBangkok(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDaysYmd(ymd: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymdBangkok();
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
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



