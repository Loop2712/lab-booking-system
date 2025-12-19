"use client";

import { useEffect, useMemo, useState } from "react";
import MyQrToken from "@/components/qr/MyQrToken";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CalendarPayload = {
  ok: boolean;
  events: any[];
};

function ymdBangkok(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const dd = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${dd}`;
}

function addDaysYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00.000+07:00`);
  d.setDate(d.getDate() + days);
  return ymdBangkok(d);
}

export default function StudentCheckPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const today = useMemo(() => ymdBangkok(new Date()), []);
  const tomorrow = useMemo(() => addDaysYmd(today, 1), [today]);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const res = await fetch(`/api/student/calendar?from=${today}&to=${tomorrow}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as CalendarPayload;
      if (!res.ok || !json?.ok) {
        setErr((json as any)?.message || "โหลดข้อมูลไม่สำเร็จ");
        setEvents([]);
        setLoading(false);
        return;
      }
      setEvents(Array.isArray(json.events) ? json.events : []);
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setEvents([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // realtime แบบ polling
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check-in / Check-out</h1>
        <p className="text-sm text-muted-foreground">
          แสดง QR TOKEN ให้เจ้าหน้าที่/อาจารย์สแกนเพื่อทำรายการ Check-in / Check-out
        </p>
      </div>

      <MyQrToken />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายการของวันนี้ ({today})</CardTitle>
          <Button variant="outline" onClick={load}>
            รีเฟรช
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {err ? <div className="text-sm text-destructive">{err}</div> : null}
          {loading ? <div className="text-sm text-muted-foreground">กำลังโหลด...</div> : null}

          {!loading && !events.length ? (
            <div className="text-sm text-muted-foreground">วันนี้ยังไม่มีรายการ</div>
          ) : null}

          {events.map((e, idx) => {
            const kind = e.kind || e.type || "EVENT";
            const title = e.title || e.courseCode || e.roomCode || "Reservation";
            const time = e.time || e.slot || "";
            const meta = e.meta || e.status || "";
            const status = e.status || e.raw?.status || "";

            return (
              <div key={idx} className="rounded-xl border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{title}</div>
                  {status ? <Badge variant="secondary">{status}</Badge> : <Badge variant="secondary">{kind}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">{time}</div>
                {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
