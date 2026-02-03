"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WeekTimelineTable, { type WeekTimelineRow } from "@/components/rooms/week-timeline-table";
import { parseTimeRangeToMinutes } from "@/lib/date/time";
import { Skeleton } from "@/components/ui/skeleton";

type Item = {
  id: string;
  type: "IN_CLASS" | "AD_HOC";
  status: string;
  date: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  createdAt: string;
  room: { code: string; name: string; roomNumber: string; floor: number };
  section?: { course?: { code: string; name: string } | null } | null;
};

const DAYS = [
  { key: "MON", label: "จันทร์" },
  { key: "TUE", label: "อังคาร" },
  { key: "WED", label: "พุธ" },
  { key: "THU", label: "พฤหัสบดี" },
  { key: "FRI", label: "ศุกร์" },
  { key: "SAT", label: "เสาร์" },
  { key: "SUN", label: "อาทิตย์" },
] as const;

const DAY_KEY_BY_SHORT: Record<string, typeof DAYS[number]["key"]> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};


const bkkWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
});

const bkkTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function bkkWeekdayKey(iso: string) {
  const short = bkkWeekdayFormatter.format(new Date(iso));
  return DAY_KEY_BY_SHORT[short] ?? "MON";
}

function bkkMinutes(iso: string) {
  const parts = bkkTimeFormatter.formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function formatDateBkk(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function statusVariant(status: string) {
  if (status === "PENDING") return "secondary";
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "CANCELLED") return "outline";
  return "secondary";
}

export default function TeacherReservationsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/reservations/my", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError("โหลดรายการไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setItems(json.items as Item[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/reservations/${id}/cancel`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "CANNOT_CANCEL_STATUS"
          ? "ยกเลิกได้เฉพาะสถานะ PENDING หรือ APPROVED"
          : json?.message === "CANCEL_TOO_LATE"
          ? "ยกเลิกไม่ได้ เนื่องจากใกล้เวลาเริ่มใช้งานแล้ว"
          : "ยกเลิกไม่สำเร็จ";
      setError(msg);
      return;
    }

    await load();
  }

  const inClassItems = useMemo(() => items.filter((r) => r.type === "IN_CLASS"), [items]);
  const adHocItems = useMemo(() => items.filter((r) => r.type !== "IN_CLASS"), [items]);

  const inClassUnique = useMemo(() => {
    const map = new Map<string, Item>();
    inClassItems.forEach((item) => {
      const courseCode = item.section?.course?.code ?? "";
      const courseName = item.section?.course?.name ?? "";
      const roomCode = item.room?.code ?? "";
      const key = [
        courseCode.trim(),
        courseName.trim(),
        roomCode.trim(),
        item.slot ?? "",
      ].join("|");
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        return;
      }
      const a = new Date(existing.startAt).getTime();
      const b = new Date(item.startAt).getTime();
      if (b > a) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [inClassItems]);

  const weeklyRows = useMemo<WeekTimelineRow[]>(() => {
    return DAYS.map((day) => {
      const bookings = inClassUnique
        .filter((item) => bkkWeekdayKey(item.startAt) === day.key)
        .map((item) => {
          const courseCode = item.section?.course?.code ?? "IN_CLASS";
          const courseName = item.section?.course?.name ?? "ตารางเรียน";
          const slotRange = parseTimeRangeToMinutes(item.slot);
          const startMin = slotRange?.startMin ?? bkkMinutes(item.startAt);
          const endMin = slotRange?.endMin ?? bkkMinutes(item.endAt);
          return {
            id: item.id,
            startMin,
            endMin,
            title: `${courseCode} ${courseName}`.trim(),
            subTitle: `ห้อง ${item.room.code}${item.room.roomNumber ? ` (${item.room.roomNumber})` : ""}`,
            colorKey: item.section?.course?.code ?? item.id,
            type: "IN_CLASS" as const,
          };
        })
        .sort((a, b) => a.startMin - b.startMin);

      return {
        key: day.key,
        label: day.label,
        bookings,
      };
    });
  }, [inClassUnique]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="rounded-lg border bg-white p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 flex-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-56" />
          <div className="rounded-2xl border p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Skeleton className="h-10 w-52" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-sm font-semibold">ตารางเรียน (IN_CLASS)</div>
        {inClassUnique.length === 0 ? (
          <div className="text-sm text-muted-foreground">ไม่มีตารางเรียนในระบบ</div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <WeekTimelineTable rows={weeklyRows} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">รายการจองอื่นๆ (AD_HOC)</div>
        {adHocItems.length === 0 ? (
          <div className="text-sm text-muted-foreground">ไม่มีรายการจองอื่นๆ</div>
        ) : (
          <div className="rounded-2xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ช่วงเวลา</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ยกเลิก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adHocItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">
                        {r.room.code} — {r.room.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ห้อง {r.room.roomNumber} — ชั้น {r.room.floor}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateBkk(r.startAt)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{r.slot}</span>
                    </TableCell>
                    <TableCell>{r.note ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status) as any}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!["PENDING", "APPROVED"].includes(r.status) || busyId === r.id}
                        onClick={() => cancel(r.id)}
                      >
                        {busyId === r.id ? "กำลังยกเลิก..." : "ยกเลิก"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

