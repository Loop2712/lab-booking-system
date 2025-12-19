"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherSchedulePage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const r = await fetch("/api/teacher/sections");
    const j = await r.json();
    setItems(j.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My กลุ่มเรียน</CardTitle>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="border rounded-md p-3 space-y-1">
              <div className="font-medium">
                {s.course.code} {s.course.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {s.dayOfWeek} {s.startTime}-{s.endTime} | Room: {s.room.code}
              </div>
              <div className="text-sm text-muted-foreground">นักศึกษาที่ลงทะเบียน: {s._count.enrollments}</div>
              <div className="text-xs text-muted-foreground break-all">id: {s.id}</div>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มี section ที่ active</div>}
        </CardContent>
      </Card>
    </div>
  );
}
