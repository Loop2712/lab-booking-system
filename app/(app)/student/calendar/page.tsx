"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type UIEvent = {
  kind: "CLASS" | "IN_CLASS" | "AD_HOC";
  title: string;
  time: string;
  meta: string;
  raw?: any;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 sun
  const diff = (day === 0 ? -6 : 1) - day; // monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function toDayName(jsDay: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay] ?? "MON";
}

// ✅ fix locale+timezone (ลด hydration mismatch)
const fmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Bangkok",
});
function prettyDate(d: Date) {
  return fmt.format(d);
}

function chipClass(kind: UIEvent["kind"]) {
  if (kind === "CLASS") return "bg-blue-100 text-blue-700 border-blue-200";
  if (kind === "IN_CLASS") return "bg-green-100 text-green-700 border-green-200";
  return "bg-purple-100 text-purple-700 border-purple-200";
}

export default function StudentCalendarPage() {
  // ✅ hooks ต้องอยู่ “ใน component” เท่านั้น
  const [mounted, setMounted] = useState(false);
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [adhoc, setAdhoc] = useState<any[]>([]);
  const [inClass, setInClass] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UIEvent | null>(null);

  useEffect(() => {
    setMounted(true);
    setWeekStart(startOfWeek(new Date())); // set หลัง mount
  }, []);

  // ✅ hooks ทั้งหมดต้องอยู่ก่อน return เสมอ
  const from = useMemo(() => (weekStart ? ymd(weekStart) : ""), [weekStart]);
  const to = useMemo(() => (weekStart ? ymd(addDays(weekStart, 6)) : ""), [weekStart]);

  const days = useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    if (!weekStart) return "";
    return `${prettyDate(weekStart)} – ${prettyDate(addDays(weekStart, 6))}`;
  }, [weekStart]);

  async function load() {
    if (!from || !to) return;

    setLoading(true);
    try {
      const r = await fetch(`/api/student/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const text = await r.text();
      const j = text ? JSON.parse(text) : null;

      if (!r.ok) {
        console.log("calendar failed:", r.status, j);
        alert(j?.message ?? `HTTP ${r.status}`);
        return;
      }

      setSections(j.sections ?? []);
      setAdhoc(j.reservations?.adhoc ?? []);
      setInClass(j.reservations?.inClass ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted && weekStart) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, from, to]);

  // ✅ early return หลัง hooks: ปลอดภัย และ placeholder ต้อง “คงที่”
  if (!mounted || !weekStart) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Calendar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  function eventsForDate(date: Date) {
    const key = ymd(date);
    const dow = toDayName(date.getDay());

    const classes: UIEvent[] = sections
      .filter((s) => s.dayOfWeek === dow)
      .map((s) => ({
        kind: "CLASS",
        title: `${s.course.code} ${s.course.name}`,
        time: `${s.startTime}-${s.endTime}`,
        meta: `Room ${s.room.code} • ${s.teacher.firstName} ${s.teacher.lastName}`,
        raw: s,
      }));

    const inclassEvents: UIEvent[] = inClass
      .filter((r) => (r.date ? ymd(new Date(r.date)) : "") === key)
      .map((r) => ({
        kind: "IN_CLASS",
        title: `${r.section.course.code} ${r.section.course.name}`,
        time: r.slot,
        meta: `Room ${r.room.code} • ${r.status}`,
        raw: r,
      }));

    const adhocEvents: UIEvent[] = adhoc
      .filter((r) => (r.date ? ymd(new Date(r.date)) : "") === key)
      .map((r) => ({
        kind: "AD_HOC",
        title: `AD_HOC Reservation`,
        time: r.slot,
        meta: `Room ${r.room.code} • ${r.status}`,
        raw: r,
      }));

    return [...classes, ...inclassEvents, ...adhocEvents];
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">My Calendar</CardTitle>
            <div className="text-sm text-muted-foreground">{weekLabel}</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWeekStart((d) => (d ? addDays(d, -7) : d))} disabled={loading}>
              ←
            </Button>
            <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date()))} disabled={loading}>
              Today
            </Button>
            <Button variant="outline" onClick={() => setWeekStart((d) => (d ? addDays(d, 7) : d))} disabled={loading}>
              →
            </Button>
            <Button variant="default" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            CLASS
          </span>
          <span className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            IN_CLASS
          </span>
          <span className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            AD_HOC
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((d) => {
          const items = eventsForDate(d);
          const dayKey = ymd(d);

          return (
            <Card key={dayKey} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{prettyDate(d)}</span>
                  <span className="text-xs text-muted-foreground">{toDayName(d.getDay())}</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {items.map((e, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left border rounded-md p-2 hover:bg-muted transition"
                    onClick={() => {
                      setSelected(e);
                      setOpen(true);
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-sm text-muted-foreground">{e.time}</div>
                        <div className="text-xs text-muted-foreground truncate">{e.meta}</div>
                      </div>
                      <span className={`shrink-0 border text-xs rounded-full px-2 py-0.5 ${chipClass(e.kind)}`}>
                        {e.kind}
                      </span>
                    </div>
                  </button>
                ))}

                {items.length === 0 && <div className="text-sm text-muted-foreground">ไม่มีรายการ</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event details</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{selected.title}</div>
                <span className={`border text-xs rounded-full px-2 py-0.5 ${chipClass(selected.kind)}`}>
                  {selected.kind}
                </span>
              </div>

              <div className="text-sm">
                <div className="text-muted-foreground">Time</div>
                <div>{selected.time}</div>
              </div>

              <div className="text-sm">
                <div className="text-muted-foreground">Info</div>
                <div>{selected.meta}</div>
              </div>

              {selected.raw?.id && <div className="text-xs text-muted-foreground break-all">id: {selected.raw.id}</div>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No selection</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
