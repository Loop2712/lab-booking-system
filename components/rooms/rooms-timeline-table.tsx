"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesOfDay(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function minutesFromSlot(slotId: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(slotId);
  if (!match) return null;
  const startH = Number(match[1]);
  const startM = Number(match[2]);
  const endH = Number(match[3]);
  const endM = Number(match[4]);
  if ([startH, startM, endH, endM].some((v) => Number.isNaN(v))) return null;
  return { startMin: startH * 60 + startM, endMin: endH * 60 + endM };
}

function bookingColor(booking: TimelineBooking) {
  return booking.type === "IN_CLASS"
    ? "bg-emerald-600/90 text-white"
    : "bg-rose-600/90 text-white";
}

function bookingLabel(booking: TimelineBooking) {
  if (booking.courseLabel) return booking.courseLabel;
  return booking.type === "AD_HOC" ? "จองนอกตาราง" : "ตารางเรียน";
}

export default function RoomsTimelineTable({ rooms, emptyMessage }: RoomsTimelineTableProps) {
  return (
    <Table className="relative">
      <TableHeader className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <TableRow>
          <TableHead className="min-w-[220px] sticky left-0 top-0 z-30 bg-background/95 backdrop-blur border-r">
            ห้อง
          </TableHead>
          {HOURS.map((h) => (
            <TableHead
              key={h}
              className="min-w-[90px] text-center sticky top-0 z-20 bg-background/95 backdrop-blur"
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
                  <div className="text-xs text-muted-foreground">
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
                    const startMin = slotRange?.startMin ?? minutesOfDay(b.startAt);
                    const endMin = slotRange?.endMin ?? minutesOfDay(b.endAt);
                    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return null;
                    return { booking: b, startMin: startMin as number, endMin: endMin as number };
                  })
                  .filter((r): r is { booking: TimelineBooking; startMin: number; endMin: number } => !!r);

                const cells: { booking: TimelineBooking | null; isStart: boolean }[] = [];

                for (const h of HOURS) {
                  const cellStart = h * 60;
                  const cellEnd = (h + 1) * 60;
                  const hit = ranges.find((r) => r.startMin < cellEnd && r.endMin > cellStart);
                  const booking = hit?.booking ?? null;
                  const prev = cells[cells.length - 1]?.booking ?? null;
                  const isStart = booking ? !prev || prev.reservationId !== booking.reservationId : false;
                  cells.push({ booking, isStart });
                }

                return cells.map((cell, idx) => (
                  <TableCell key={idx} className="p-0">
                    {cell.booking ? (
                      <div className={cn("h-12 px-2 py-1 text-[11px] leading-tight", bookingColor(cell.booking))}>
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
                      <div className="h-12 px-2 py-1 text-[11px] text-muted-foreground bg-muted/10" />
                    )}
                  </TableCell>
                ));
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
