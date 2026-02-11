"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RoomsTimelineTable from "@/components/rooms/rooms-timeline-table";
import type { TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";
import RangeSearchDialog from "./_components/RangeSearchDialog";
import RoomsTodayLegend from "./_components/RoomsTodayLegend";
import RoomsTodayToolbar from "./_components/RoomsTodayToolbar";
import type { RangeItem, RoomsTodayPayload } from "./types";
import { addDaysYmd, ymdBangkok } from "./utils";

export default function RoomsTodayClient() {
  const [data, setData] = useState<RoomsTodayPayload | null>(null);
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
      const json = (await res.json().catch(() => ({}))) as RoomsTodayPayload;
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
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [load, selectedDate, todayYmd]);

  const rooms = useMemo<TimelineRoomRow[]>(() => {
    if (!data?.rooms) return [];
    const keyword = q.trim().toLowerCase();
    if (!keyword) return data.rooms;
    return data.rooms.filter((room) => {
      const hay = `${room.code} ${room.name} ${room.roomNumber} ${room.floor}`.toLowerCase();
      return hay.includes(keyword);
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
    const params = new URLSearchParams({ roomId: rangeRoomId, from: rangeFrom, to: rangeTo });
    fetch(`/api/rooms/range?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json?.ok) {
          setRangeError(json?.message || "ค้นหาไม่สำเร็จ");
          return;
        }
        setRangeItems(Array.isArray(json.items) ? json.items : []);
        const label = json?.room ? `${json.room.code} • ${json.room.roomNumber} • ชั้น ${json.room.floor}` : null;
        setRangeRoomLabel(label);
      })
      .catch((e) => {
        setRangeError(e?.message || "ค้นหาไม่สำเร็จ");
      })
      .finally(() => setRangeLoading(false));
  }

  return (
    <div className="space-y-6">
      <RoomsTodayToolbar
        q={q}
        selectedDate={selectedDate}
        todayYmd={todayYmd}
        onQChange={setQ}
        onDateChange={setSelectedDate}
        onPrevDate={() => setSelectedDate(addDaysYmd(selectedDate, -1))}
        onNextDate={() => setSelectedDate(addDaysYmd(selectedDate, 1))}
        onToday={() => setSelectedDate(todayYmd)}
        onOpenRange={() => setRangeOpen(true)}
        onRefresh={load}
      />

      <RoomsTodayLegend date={data?.date} lastUpdated={lastUpdated} />

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
          <CardContent>
            <RoomsTimelineSkeleton />
          </CardContent>
        </Card>
      ) : null}

      <RangeSearchDialog
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
        rooms={data?.rooms ?? []}
        roomId={rangeRoomId}
        from={rangeFrom}
        to={rangeTo}
        error={rangeError}
        loading={rangeLoading}
        roomLabel={rangeRoomLabel}
        items={rangeItems}
        onRoomIdChange={setRangeRoomId}
        onFromChange={setRangeFrom}
        onToChange={setRangeTo}
        onSearch={runRangeSearch}
      />

      <div className="rounded-lg border bg-white/90">
        <RoomsTimelineTable rooms={rooms} />
      </div>
    </div>
  );
}

function RoomsTimelineSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="flex gap-2">
          <Skeleton className="h-12 w-52" />
          <Skeleton className="h-12 flex-1" />
        </div>
      ))}
    </div>
  );
}
