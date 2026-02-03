"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RoomsTimelineTable, { TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";

type Payload = {
  ok: boolean;
  date: string;
  rooms: TimelineRoomRow[];
};

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
          <RoomsTimelineTable rooms={rooms} />
        </div>
      </CardContent>
    </Card>
  );
}


