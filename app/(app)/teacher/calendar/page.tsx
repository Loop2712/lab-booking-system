"use client";
import type { UIEvent } from "./types";
import { ymd } from "@/lib/date/ymd";
import { addDays } from "@/lib/date/addDays";
import { startOfWeek } from "@/lib/date/startOfWeek";
import { prettyDate } from "@/lib/date/prettyDate";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// ✅ fix locale+timezone ลด hydration mismatch

export default function TeacherCalendarPage() {
    const [mounted, setMounted] = useState(false);
    const [weekStart, setWeekStart] = useState<Date | null>(null);

    const [loading, setLoading] = useState(false);
    const [inClass, setInClass] = useState<any[]>([]);

    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<UIEvent | null>(null);
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
            const r = await fetch("/api/rooms");
            const j = await r.json();
            if (r.ok && j.ok) setRooms(j.rooms ?? []);
        })();
    }, []);


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
            const r = await fetch(`/api/teacher/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
            const text = await r.text();
            const j = text ? JSON.parse(text) : null;

            if (!r.ok) {
                console.log("teacher calendar failed:", r.status, j);
                alert(j?.message ?? `HTTP ${r.status}`);
                return;
            }

            setInClass(j.reservations?.inClass ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (mounted && weekStart) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, from, to]);

    // ✅ placeholder คงที่
    if (!mounted || !weekStart) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Teacher Calendar</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
                </Card>
            </div>
        );
    }

    function eventsForDate(date: Date): UIEvent[] {
        const key = ymd(date);
        return inClass
            .filter((r) => (r.date ? ymd(new Date(r.date)) : "") === key)
            .map((r) => ({
                title: `${r.section.course.code} ${r.section.course.name}`,
                time: r.slot,
                meta: `Room ${r.room.code} • ${r.status}`,
                raw: r,
            }));
    }
    function toYMD(d?: Date) {
        if (!d) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg">Teacher Calendar</CardTitle>
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
                        <Button onClick={load} disabled={loading}>
                            {loading ? "Loading..." : "Refresh"}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="text-sm text-muted-foreground">
                    แสดงทั้งตารางเรียน (IN_CLASS) ที่ระบบสร้างจาก Section และการจองแบบจองเอง (AD_HOC)
                </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {days.map((d) => {
                    const items = eventsForDate(d);
                    const dayKey = ymd(d);

                    return (
                        <Card key={dayKey} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">{prettyDate(d)}</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-2">
                                {loading ? (
                                    <div className="space-y-2">
                                        <div className="h-10 rounded-md bg-muted animate-pulse" />
                                        <div className="h-10 rounded-md bg-muted animate-pulse" />
                                    </div>
                                ) : (
                                    <>
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
                                                <div className="font-medium">{e.title}</div>
                                                <div className="text-sm text-muted-foreground">{e.time}</div>
                                                <div className="text-xs text-muted-foreground">{e.meta}</div>
                                            </button>
                                        ))}

                                        {items.length === 0 && <div className="text-sm text-muted-foreground">List</div>}
                                    </>
                                )}
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
                            <div className="font-semibold">{selected.title}</div>

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
            <Button onClick={() => setOpenCreate(true)}>Booking AD_HOC</Button>

            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>จองห้อง (AD_HOC)</DialogTitle>
                        <DialogDescription>
                            เลือกห้อง วันที่ และช่วงเวลา (การจองของอาจารย์จะอนุมัติทันที)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm mb-1">Room</div>
                            <Select value={roomId} onValueChange={setRoomId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกห้อง" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            ชั้น {r.floor} — ห้อง {r.roomNumber} ({r.computerCount} เครื่อง)
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
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            {date ? toYMD(date) : "เลือกวันที่"}
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                        </div>

                        <div>
                            <div className="text-sm mb-1">ช่วงเวลา</div>
                            <Select value={slotId} onValueChange={setSlotId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                                        const res = await fetch("/api/reservations", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                roomId,
                                                date: toYMD(date),
                                                slotId,
                                                note,
                                            }),

                                        });
                                        const j = await res.json();
                                        if (!res.ok || !j.ok) {
                                            setCreateErr(j?.message ?? "สร้างการจองไม่สำเร็จ");
                                            return;
                                        }
                                        setOpenCreate(false);
                                        // reload calendar ของหน้า teacher
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
