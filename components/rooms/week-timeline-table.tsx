"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type WeekTimelineBooking = {
  id: string;
  startMin: number;
  endMin: number;
  title: string;
  subTitle?: string | null;
  type?: "IN_CLASS" | "AD_HOC";
  colorKey?: string;
};

export type WeekTimelineRow = {
  key: string;
  label: string;
  bookings: WeekTimelineBooking[];
};

type WeekTimelineTableProps = {
  rows: WeekTimelineRow[];
  emptyMessage?: string;
};

const START_HOUR = 7;
const END_HOUR = 21; // exclusive
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function bookingColor(type?: "IN_CLASS" | "AD_HOC") {
  if (type === "AD_HOC") return "bg-rose-600/90 text-white";
  return "bg-emerald-600/90 text-white";
}

const COLOR_CLASSES = [
  "bg-emerald-100 border-emerald-200 text-emerald-900",
  "bg-sky-100 border-sky-200 text-sky-900",
  "bg-amber-100 border-amber-200 text-amber-900",
  "bg-rose-100 border-rose-200 text-rose-900",
  "bg-violet-100 border-violet-200 text-violet-900",
  "bg-lime-100 border-lime-200 text-lime-900",
  "bg-orange-100 border-orange-200 text-orange-900",
];

function colorForKey(key: string) {
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) {
    sum = (sum + key.charCodeAt(i)) % 997;
  }
  return COLOR_CLASSES[sum % COLOR_CLASSES.length];
}

export default function WeekTimelineTable({ rows, emptyMessage }: WeekTimelineTableProps) {
  const hasBookings = rows.some((row) => row.bookings.length > 0);

  return (
    <Table className="relative w-full table-fixed">
      <TableHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <TableRow>
          <TableHead className="w-[90px] sticky left-0 top-0 z-30 bg-background/95 backdrop-blur border-r text-xs">
            วัน/เวลา
          </TableHead>
          {HOURS.map((h) => (
            <TableHead
              key={h}
              className="text-center sticky top-0 z-20 bg-background/95 backdrop-blur text-[10px] font-medium"
            >
              {pad2(h)}:00
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {hasBookings ? (
          rows.map((row) => {
            const ranges = row.bookings.map((b) => ({
              booking: b,
              startMin: b.startMin,
              endMin: b.endMin,
            }));

            const cells: { booking: WeekTimelineBooking | null; isStart: boolean }[] = [];
            for (const h of HOURS) {
              const cellStart = h * 60;
              const cellEnd = (h + 1) * 60;
              const hit = ranges.find((r) => r.startMin < cellEnd && r.endMin > cellStart);
              const booking = hit?.booking ?? null;
              const prev = cells[cells.length - 1]?.booking ?? null;
              const isStart = booking ? !prev || prev.id !== booking.id : false;
              cells.push({ booking, isStart });
            }

            return (
              <TableRow key={row.key}>
                <TableCell className="font-medium sticky left-0 z-10 bg-background/95 border-r text-xs">
                  {row.label}
                </TableCell>
                {cells.map((cell, idx) => (
                  <TableCell key={`${row.key}-${idx}`} className="p-0">
                    {cell.booking ? (
                      <div
                        className={cn(
                          "h-10 px-1.5 py-1 text-[10px] leading-tight",
                          cell.booking.colorKey
                            ? colorForKey(cell.booking.colorKey)
                            : bookingColor(cell.booking.type)
                        )}
                      >
                        {cell.isStart ? (
                          <>
                            <div className="font-medium truncate">{cell.booking.title}</div>
                            {cell.booking.subTitle ? (
                              <div className="truncate">{cell.booking.subTitle}</div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="h-10 px-1.5 py-1 text-[10px] text-muted-foreground bg-muted/10" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={HOURS.length + 1} className="text-center text-sm text-muted-foreground">
              {emptyMessage ?? "ไม่พบข้อมูลตาราง"}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
