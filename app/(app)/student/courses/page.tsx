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
import WeekTimelineTable, { type WeekTimelineRow } from "@/components/rooms/week-timeline-table";
import { parseTimeToMinutes } from "@/lib/date/time";

const DAYS = [
  { key: "MON", label: "จันทร์" },
  { key: "TUE", label: "อังคาร" },
  { key: "WED", label: "พุธ" },
  { key: "THU", label: "พฤหัสบดี" },
  { key: "FRI", label: "ศุกร์" },
  { key: "SAT", label: "เสาร์" },
  { key: "SUN", label: "อาทิตย์" },
] as const;

function timeToMinutes(value: string) {
  return parseTimeToMinutes(value) ?? 0;
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

  const weeklyRows = useMemo<WeekTimelineRow[]>(() => {
    return DAYS.map((day) => {
      const bookings = enrolledSections
        .filter((section) => section.dayOfWeek === day.key)
        .map((section) => ({
          id: section.sectionId ?? section.id,
          startMin: timeToMinutes(section.startTime),
          endMin: timeToMinutes(section.endTime),
          title: `${section.course.code} ${section.course.name}`,
          subTitle: `ห้อง ${section.room.code}${section.room.roomNumber ? ` (${section.room.roomNumber})` : ""}`,
          colorKey: section.sectionId ?? section.id,
          type: "IN_CLASS" as const,
        }))
        .sort((a, b) => a.startMin - b.startMin);

      return {
        key: day.key,
        label: day.label,
        bookings,
      };
    });
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
            <div className="rounded-lg border bg-white overflow-hidden">
              <WeekTimelineTable rows={weeklyRows} />
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
