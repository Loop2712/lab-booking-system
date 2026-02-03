"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import type { SectionItem } from "./types";
import { loadMyEnrollments } from "./loadMyEnrollments";
import { loadSections } from "./loadSections";
import { labelSection } from "./labelSection";
import { addEnrollment } from "./addEnrollment";
import { removeEnrollment } from "./removeEnrollment";

const DAYS = [
  { key: "MON", label: "จันทร์" },
  { key: "TUE", label: "อังคาร" },
  { key: "WED", label: "พุธ" },
  { key: "THU", label: "พฤหัสบดี" },
  { key: "FRI", label: "ศุกร์" },
  { key: "SAT", label: "เสาร์" },
  { key: "SUN", label: "อาทิตย์" },
] as const;

const SLOT_MINUTES = 30;
const DEFAULT_START_MIN = 8 * 60;
const DEFAULT_END_MIN = 18 * 60;

const COLOR_CLASSES = [
  "bg-emerald-100 border-emerald-200 text-emerald-900",
  "bg-sky-100 border-sky-200 text-sky-900",
  "bg-amber-100 border-amber-200 text-amber-900",
  "bg-rose-100 border-rose-200 text-rose-900",
  "bg-violet-100 border-violet-200 text-violet-900",
  "bg-lime-100 border-lime-200 text-lime-900",
  "bg-orange-100 border-orange-200 text-orange-900",
];

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function colorForKey(key: string) {
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) {
    sum = (sum + key.charCodeAt(i)) % 997;
  }
  return COLOR_CLASSES[sum % COLOR_CLASSES.length];
}

export default function StudentCoursesPage() {
  const [open, setOpen] = useState(false);

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);

  useEffect(() => {
    loadMyEnrollments({ setMyEnrollments });
    loadSections({ setSections });
  }, []);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedSectionId),
    [sections, selectedSectionId]
  );

  type EnrolledSection = SectionItem & { sectionId?: string };

  const enrolledSections = useMemo<EnrolledSection[]>(() => {
    return myEnrollments
      .map((e) => ({
        ...e.section,
        sectionId: e.sectionId,
      }))
      .filter((s) => s?.startTime && s?.endTime && s?.dayOfWeek);
  }, [myEnrollments]);

  const timeBounds = useMemo(() => {
    if (enrolledSections.length === 0) {
      return { start: DEFAULT_START_MIN, end: DEFAULT_END_MIN };
    }
    const starts = enrolledSections.map((s) => timeToMinutes(s.startTime));
    const ends = enrolledSections.map((s) => timeToMinutes(s.endTime));
    const minStart = Math.min(...starts, DEFAULT_START_MIN);
    const maxEnd = Math.max(...ends, DEFAULT_END_MIN);
    return { start: minStart, end: maxEnd };
  }, [enrolledSections]);

  const slots = useMemo(() => {
    const items: { start: number; end: number; label: string }[] = [];
    for (let m = timeBounds.start; m < timeBounds.end; m += SLOT_MINUTES) {
      const end = m + SLOT_MINUTES;
      items.push({
        start: m,
        end,
        label: `${formatTime(m)}-${formatTime(end)}`,
      });
    }
    return items;
  }, [timeBounds]);

  const scheduleByDay = useMemo(() => {
    const map = new Map<string, typeof enrolledSections>();
    DAYS.forEach((d) => map.set(d.key, []));
    enrolledSections.forEach((section) => {
      const list = map.get(section.dayOfWeek) ?? [];
      list.push(section);
      map.set(section.dayOfWeek, list);
    });
    return map;
  }, [enrolledSections]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มรายวิชาที่ลงทะเบียน (ค้นหาแล้วเลือกได้)</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start md:w-[520px]">
                {selected ? labelSection(selected) : "ค้นหา/เลือก Section..."}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0 md:w-[560px]" align="start">
              <Command>
                <CommandInput placeholder="พิมพ์ค้นหา เช่น รหัสวิชา / ชื่อวิชา / ห้อง / อาจารย์..." />
                <CommandList>
                  <CommandEmpty>ไม่พบรายการ</CommandEmpty>
                  <CommandGroup heading="กลุ่มเรียน ที่เปิดใช้งาน">
                    {sections.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={labelSection(s)}
                        onSelect={() => {
                          setSelectedSectionId(s.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <div className="text-sm">{labelSection(s)}</div>
                          <div className="text-xs text-muted-foreground break-all">id: {s.id}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            onClick={() =>
              addEnrollment({
                selectedSectionId,
                setSelectedSectionId,
                refreshMyEnrollments: () => loadMyEnrollments({ setMyEnrollments }),
              })
            }
            disabled={!selectedSectionId}
          >
            Add
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              loadMyEnrollments({ setMyEnrollments });
              loadSections({ setSections });
            }}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ตารางสอนของฉัน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrolledSections.length === 0 ? (
            <div className="text-sm text-muted-foreground">ยังไม่มีวิชาที่ลงทะเบียน</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[960px] border-collapse text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="w-28 border px-2 py-2 text-left">วัน/เวลา</th>
                    {slots.map((slot) => (
                      <th key={slot.start} className="border px-2 py-2 text-center font-medium">
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => {
                    const items = (scheduleByDay.get(day.key) ?? []).sort(
                      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
                    );

                    const cells: Array<
                      | { type: "empty" }
                      | { type: "skip" }
                      | { type: "block"; span: number; sections: EnrolledSection[] }
                    > = Array.from({ length: slots.length }, () => ({ type: "empty" }));

                    items.forEach((section) => {
                      const startMin = timeToMinutes(section.startTime);
                      const endMin = timeToMinutes(section.endTime);
                      const startIdx = Math.max(
                        0,
                        Math.floor((startMin - timeBounds.start) / SLOT_MINUTES)
                      );
                      const endIdx = Math.min(
                        slots.length,
                        Math.ceil((endMin - timeBounds.start) / SLOT_MINUTES)
                      );
                      const span = Math.max(1, endIdx - startIdx);

                      const existing = cells[startIdx];
                      if (existing.type === "block") {
                        existing.sections.push(section);
                        existing.span = Math.max(existing.span, span);
                      } else {
                        cells[startIdx] = { type: "block", span, sections: [section] };
                      }
                      for (let i = startIdx + 1; i < startIdx + span && i < cells.length; i += 1) {
                        if (cells[i].type !== "block") {
                          cells[i] = { type: "skip" };
                        }
                      }
                    });

                    return (
                      <tr key={day.key}>
                        <td className="border px-2 py-2 font-medium">{day.label}</td>
                        {cells.map((cell, idx) => {
                          if (cell.type === "skip") return null;
                          if (cell.type === "empty") {
                            return <td key={`${day.key}-e-${idx}`} className="border px-2 py-2" />;
                          }

                          return (
                            <td
                              key={`${day.key}-b-${idx}`}
                              className="border px-1 py-1 align-top"
                              colSpan={cell.span}
                            >
                              <div className="flex flex-col gap-1">
                                {cell.sections.map((section) => {
                                  const sectionKey = section.sectionId ?? section.id;
                                  return (
                                  <div
                                    key={`${sectionKey}-${section.course.code}`}
                                    className={`rounded-md border p-2 ${colorForKey(sectionKey)}`}
                                  >
                                    <div className="font-semibold">{section.course.code}</div>
                                    <div className="text-[11px]">{section.course.name}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      ห้อง {section.room.code}
                                      {section.room.roomNumber ? ` (${section.room.roomNumber})` : ""}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {section.startTime}-{section.endTime}
                                    </div>
                                  </div>
                                );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {myEnrollments.length > 0 ? (
            <div className="space-y-2 pt-2">
              <div className="text-sm font-medium">รายการวิชาที่ลงทะเบียน</div>
              {myEnrollments.map((e) => (
                <div key={e.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {e.section.course.code} {e.section.course.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {e.section.dayOfWeek} {e.section.startTime}-{e.section.endTime} | Room: {e.section.room.code} | Teacher:{" "}
                      {e.section.teacher.firstName} {e.section.teacher.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">sectionId: {e.sectionId}</div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      removeEnrollment({
                        sectionId: e.sectionId,
                        refreshMyEnrollments: () => loadMyEnrollments({ setMyEnrollments }),
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
