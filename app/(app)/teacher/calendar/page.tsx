"use client";

import { ymd } from "@/lib/date/ymd";
import { addDays } from "@/lib/date/addDays";
import { startOfWeek } from "@/lib/date/startOfWeek";
import { prettyDate } from "@/lib/date/prettyDate";
import { createTeacherReservation, fetchRooms, fetchTeacherCalendar } from "@/lib/services/teacher-calendar";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import WeekEventGrid from "@/components/calendar/WeekEventGrid";
import WeekRangeHeader from "@/components/calendar/WeekRangeHeader";
import type { CalendarGridDay, CalendarGridEvent } from "@/components/calendar/types";

export default function TeacherCalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [weekStart, setWeekStart] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);
  const [inClass, setInClass] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarGridEvent | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slotId, setSlotId] = useState("08:00-12:00");
  const [note, setNote] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loadedRooms = await fetchRooms();
        setRooms(loadedRooms);
      } catch (error) {
        console.log("rooms failed:", error);
      }
    })();
  }, []);

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
      const events: CalendarGridEvent[] = inClass
        .filter((row) => (row.date ? ymd(new Date(row.date)) : "") === key)
        .map((row) => ({
          id: row.id,
          title: `${row.section.course.code} ${row.section.course.name}`,
          time: row.slot,
          meta: `Room ${row.room.code} • ${row.status}`,
        }));

      return {
        key,
        title: prettyDate(day),
        events,
      };
    });
  }, [days, inClass]);

  async function load() {
    if (!from || !to) return;

    setLoading(true);
    try {
      const data = await fetchTeacherCalendar(from, to);
      setInClass(data.reservations?.inClass ?? []);
    } catch (error: any) {
      console.log("teacher calendar failed:", error);
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

  function toYMD(d?: Date) {
    if (!d) return "";
    return ymd(d);
  }

  return (
    <div className="space-y-6">
      <WeekRangeHeader
        title="Teacher Calendar"
        weekLabel={weekLabel}
        loading={loading}
        onPrev={() => setWeekStart((d) => (d ? addDays(d, -7) : d))}
        onToday={() => setWeekStart(startOfWeek(new Date()))}
        onNext={() => setWeekStart((d) => (d ? addDays(d, 7) : d))}
        onRefresh={load}
        summary="แสดงทั้งตารางเรียน (IN_CLASS) ที่ระบบสร้างจาก Section และการจองแบบจองเอง (AD_HOC)"
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

      <Button onClick={() => setOpenCreate(true)}>Booking AD_HOC</Button>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>จองห้อง (AD_HOC)</DialogTitle>
            <DialogDescription>เลือกห้อง วันที่ และช่วงเวลา (การจองของอาจารย์จะอนุมัติทันที)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm mb-1">Room</div>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      ชั้น {room.floor} — ห้อง {room.roomNumber} ({room.computerCount} เครื่อง)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm mb-1">วันที่ (YYYY-MM-DD)</div>
              <div>
                <div className="text-sm mb-1">เลือกวันที่</div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {date ? ymd(date) : "เลือกวันที่"}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <div className="text-sm mb-1">ช่วงเวลา</div>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00-12:00">08:00 - 12:00</SelectItem>
                  <SelectItem value="12:00-16:00">12:00 - 16:00</SelectItem>
                  <SelectItem value="16:00-20:00">16:00 - 20:00</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm mb-1">หมายเหตุ</div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ถ้ามี" />
            </div>

            {createErr ? <div className="text-sm text-red-600">{createErr}</div> : null}

            <div className="flex gap-2">
              <Button
                disabled={createBusy}
                onClick={async () => {
                  setCreateErr(null);
                  setCreateBusy(true);
                  try {
                    await createTeacherReservation({
                      roomId,
                      date: toYMD(date),
                      slotId,
                      note,
                    });
                    setOpenCreate(false);
                    await load();
                  } catch (e: any) {
                    setCreateErr(e?.message ?? "ERROR");
                  } finally {
                    setCreateBusy(false);
                  }
                }}
              >
                Booking
              </Button>

              <Button variant="secondary" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
