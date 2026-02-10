"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { minutesFromIsoBangkok, parseTimeRangeToMinutes } from "@/lib/date/time";

export type TimelineBooking = {
  reservationId: string;
  slot: string;
  type: "IN_CLASS" | "AD_HOC";
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED"
    | "NO_SHOW"
    | "CHECKED_IN"
    | "COMPLETED";
  requesterLabel?: string | null;
  borrowerLabel?: string | null;
  courseLabel?: string | null;
  note?: string | null;
  startAt: string;
  endAt: string;
};

export type TimelineRoomRow = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  slots: { slotId: string; label: string; booking: TimelineBooking | null }[];
};

type RoomsTimelineTableProps = {
  rooms: TimelineRoomRow[];
  emptyMessage?: string;
};

const START_HOUR = 7;
const END_HOUR = 21; // exclusive
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const CLASS_COLORS = [
  "bg-emerald-600/90 text-white",
  "bg-teal-600/90 text-white",
  "bg-sky-600/90 text-white",
  "bg-cyan-600/90 text-white",
  "bg-green-600/90 text-white",
];

const ADHOC_COLORS = [
  "bg-rose-600/90 text-white",
  "bg-red-600/90 text-white",
  "bg-orange-600/90 text-white",
  "bg-amber-600/90 text-white",
  "bg-pink-600/90 text-white",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesFromSlot(slot?: string | null) {
  return parseTimeRangeToMinutes(slot);
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function bookingColor(booking: TimelineBooking) {
  const palette = booking.type === "IN_CLASS" ? CLASS_COLORS : ADHOC_COLORS;
  const idx = hashString(booking.reservationId) % palette.length;
  return palette[idx];
}

function bookingLabel(booking: TimelineBooking) {
  if (booking.courseLabel) return booking.courseLabel;
  return booking.type === "AD_HOC" ? "จองนอกตาราง" : "ตารางเรียน";
}

export default function RoomsTimelineTable({ rooms, emptyMessage }: RoomsTimelineTableProps) {
  return (
    <Table className="relative w-full table-fixed">
      <TableHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <TableRow>
          <TableHead className="w-[180px] sticky left-0 top-0 z-30 bg-background/95 backdrop-blur border-r text-xs">
            ห้อง
          </TableHead>
          {HOURS.map((h) => (
            <TableHead
              key={h}
              className="w-[56px] text-center sticky top-0 z-20 bg-background/95 backdrop-blur text-[10px]"
            >
              {pad2(h)}:00
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.length ? (
          rooms.map((room) => (
            <TableRow key={room.id}>
              <TableCell className="font-medium sticky left-0 z-10 bg-background/95 border-r">
                <div className="space-y-1">
                  <div>
                    {room.code} • {room.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    ห้อง {room.roomNumber} (ชั้น {room.floor})
                  </div>
                </div>
              </TableCell>
              {(() => {
                const rawBookings = room.slots
                  .map((s) => s.booking)
                  .filter((b): b is TimelineBooking => !!b);

                const seen = new Set<string>();
                const bookings = rawBookings.filter((b) => {
                  if (seen.has(b.reservationId)) return false;
                  seen.add(b.reservationId);
                  return true;
                });

                const ranges = bookings
                  .map((b) => {
                    const slotRange = minutesFromSlot(b.slot);
                    const startMin = slotRange?.startMin ?? minutesFromIsoBangkok(b.startAt);
                    const endMin = slotRange?.endMin ?? minutesFromIsoBangkok(b.endAt);
                    if (startMin == null || endMin == null) return null;
                    return { booking: b, startMin, endMin };
                  })
                  .filter((r): r is { booking: TimelineBooking; startMin: number; endMin: number } => !!r);

                const cells: { booking: TimelineBooking | null; isStart: boolean; isEnd: boolean }[] = [];

                for (const h of HOURS) {
                  const cellStart = h * 60;
                  const cellEnd = (h + 1) * 60;
                  const hit = ranges.find((r) => r.startMin < cellEnd && r.endMin > cellStart);
                  const booking = hit?.booking ?? null;
                  const prev = cells[cells.length - 1]?.booking ?? null;
                  const isStart = booking ? !prev || prev.reservationId !== booking.reservationId : false;
                  cells.push({ booking, isStart, isEnd: false });
                }

                for (let i = 0; i < cells.length; i++) {
                  const current = cells[i];
                  if (!current.booking) continue;
                  const next = cells[i + 1]?.booking ?? null;
                  current.isEnd = !next || next.reservationId !== current.booking.reservationId;
                }

                return cells.map((cell, idx) => {
                  const stripe = idx % 2 === 0 ? "bg-muted/5" : "bg-muted/10";
                  return (
                    <TableCell key={idx} className="p-0">
                      {cell.booking ? (
                        <div
                          className={cn(
                            "h-12 px-1 py-1 text-[10px] leading-tight",
                            bookingColor(cell.booking),
                            cell.isStart ? "border-l-4 border-black/20" : "",
                            cell.isEnd ? "border-r-4 border-black/20" : ""
                          )}
                        >
                          {cell.isStart ? (
                            <>
                          <div className="font-medium truncate">{bookingLabel(cell.booking)}</div>
                              {cell.booking.borrowerLabel ? (
                                <div className="truncate">{cell.booking.borrowerLabel}</div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <div className={cn("h-12 px-2 py-1 text-[11px] text-muted-foreground", stripe)} />
                      )}
                    </TableCell>
                  );
                });
              })()}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={HOURS.length + 1} className="text-center text-sm text-muted-foreground">
              {emptyMessage ?? "ไม่พบข้อมูลห้อง"}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
