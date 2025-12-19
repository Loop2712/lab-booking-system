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

type SectionItem = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  course: { code: string; name: string };
  room: { code: string; name: string; roomNumber?: string | null };
  teacher: { firstName: string; lastName: string; email?: string | null };
};

export default function StudentรายวิชาPage() {
  const [open, setOpen] = useState(false);

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);

  async function loadMy() {
    const r = await fetch("/api/student/enrollments");
    const j = await r.json();
    setMyEnrollments(j.items ?? []);
  }

  async function loadSections() {
    const r = await fetch("/api/student/sections");
    const j = await r.json();
    setSections(j.items ?? []);
  }

  useEffect(() => {
    loadMy();
    loadSections();
  }, []);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedSectionId),
    [sections, selectedSectionId]
  );

  function label(s: SectionItem) {
    const teacher = `${s.teacher.firstName} ${s.teacher.lastName}`;
    const room = `${s.room.code}${s.room.roomNumber ? ` (${s.room.roomNumber})` : ""}`;
    return `${s.course.code} — ${s.course.name} | ${s.dayOfWeek} ${s.startTime}-${s.endTime} | ${room} | ${teacher}`;
  }

  async function add() {
    if (!selectedSectionId) return;

    const r = await fetch("/api/student/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: selectedSectionId }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");

    setSelectedSectionId("");
    await loadMy();
  }

  async function remove(sectionId: string) {
    const r = await fetch("/api/student/enrollments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    await loadMy();
  }

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
                {selected ? label(selected) : "ค้นหา/เลือก Section..."}
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
                        value={label(s)}
                        onSelect={() => {
                          setSelectedSectionId(s.id);
                          setOpen(false);
                        }}
                      >
                        <div className="flex flex-col">
                          <div className="text-sm">{label(s)}</div>
                          <div className="text-xs text-muted-foreground break-all">id: {s.id}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button onClick={add} disabled={!selectedSectionId}>
            Add
          </Button>

          <Button variant="secondary" onClick={() => { loadMy(); loadSections(); }}>
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ของฉัน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
              <Button variant="destructive" onClick={() => remove(e.sectionId)}>
                Remove
              </Button>
            </div>
          ))}
          {myEnrollments.length === 0 && (
            <div className="text-sm text-muted-foreground">ยังไม่ได้เพิ่มรายวิชา</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
