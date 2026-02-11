"use client";

import { ymd } from "@/lib/date/ymd";
import { addDays } from "@/lib/date/addDays";
import { startOfWeek } from "@/lib/date/startOfWeek";
import { toDayName } from "@/lib/date/toDayName";
import { prettyDate } from "@/lib/date/prettyDate";
import { chipClass } from "./chipClass";
import { fetchStudentCalendar } from "@/lib/services/student-calendar";
import { useEffect, useMemo, useState } from "react";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import WeekEventGrid from "@/components/calendar/WeekEventGrid";
import WeekRangeHeader from "@/components/calendar/WeekRangeHeader";
import type { CalendarGridDay, CalendarGridEvent } from "@/components/calendar/types";

export default function StudentCalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<any[]>([]);
  const [adhoc, setAdhoc] = useState<any[]>([]);
  const [inClass, setInClass] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarGridEvent | null>(null);

  useEffect(() => {
    setMounted(true);
    setWeekStart(startOfWeek(new Date()));
  }, []);

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

  const calendarDays = useMemo<CalendarGridDay[]>(() => {
    return days.map((day) => {
      const key = ymd(day);
      const dow = toDayName(day.getDay());

      const classEvents: CalendarGridEvent[] = sections
        .filter((section) => section.dayOfWeek === dow)
        .map((section) => ({
          id: section.id,
          title: `${section.course.code} ${section.course.name}`,
          time: `${section.startTime}-${section.endTime}`,
          meta: `Room ${section.room.code} • ${section.teacher.firstName} ${section.teacher.lastName}`,
          badge: "CLASS",
          badgeClassName: chipClass("CLASS"),
        }));

      const inClassEvents: CalendarGridEvent[] = inClass
        .filter((reservation) => (reservation.date ? ymd(new Date(reservation.date)) : "") === key)
        .map((reservation) => ({
          id: reservation.id,
          title: `${reservation.section.course.code} ${reservation.section.course.name}`,
          time: reservation.slot,
          meta: `Room ${reservation.room.code} • ${reservation.status}`,
          badge: "IN_CLASS",
          badgeClassName: chipClass("IN_CLASS"),
        }));

      const adHocEvents: CalendarGridEvent[] = adhoc
        .filter((reservation) => (reservation.date ? ymd(new Date(reservation.date)) : "") === key)
        .map((reservation) => ({
          id: reservation.id,
          title: "AD_HOC Reservation",
          time: reservation.slot,
          meta: `Room ${reservation.room.code} • ${reservation.status}`,
          badge: "AD_HOC",
          badgeClassName: chipClass("AD_HOC"),
        }));

      return {
        key,
        title: prettyDate(day),
        subtitle: toDayName(day.getDay()),
        events: [...classEvents, ...inClassEvents, ...adHocEvents],
      };
    });
  }, [days, sections, inClass, adhoc]);

  async function load() {
    if (!from || !to) return;

    setLoading(true);
    try {
      const data = await fetchStudentCalendar(from, to);
      setSections(data.sections ?? []);
      setAdhoc(data.reservations?.adhoc ?? []);
      setInClass(data.reservations?.inClass ?? []);
    } catch (error: any) {
      console.log("calendar failed:", error);
      alert(error?.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted && weekStart) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, from, to]);

  if (!mounted || !weekStart) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <WeekRangeHeader
        title="My Calendar"
        weekLabel={weekLabel}
        loading={loading}
        onPrev={() => setWeekStart((d) => (d ? addDays(d, -7) : d))}
        onToday={() => setWeekStart(startOfWeek(new Date()))}
        onNext={() => setWeekStart((d) => (d ? addDays(d, 7) : d))}
        onRefresh={load}
        summary={
          <div className="flex flex-wrap gap-2 text-sm">
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
          </div>
        }
      />

      <WeekEventGrid
        days={calendarDays}
        loading={loading}
        onSelect={(event) => {
          setSelected(event);
          setOpen(true);
        }}
      />

      <EventDetailDialog open={open} onOpenChange={setOpen} event={selected} />
    </div>
  );
}
