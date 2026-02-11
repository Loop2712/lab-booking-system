"use client";

import type { TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";
import type { RangeItem } from "../types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatTimeRange } from "../utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: TimelineRoomRow[];
  roomId: string;
  from: string;
  to: string;
  error: string | null;
  loading: boolean;
  roomLabel: string | null;
  items: RangeItem[];
  onRoomIdChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSearch: () => void;
};

export default function RangeSearchDialog({
  open,
  onOpenChange,
  rooms,
  roomId,
  from,
  to,
  error,
  loading,
  roomLabel,
  items,
  onRoomIdChange,
  onFromChange,
  onToChange,
  onSearch,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ค้นหาแบบช่วงวันที่</DialogTitle>
          <DialogDescription>เลือกห้องและช่วงวันที่เพื่อดูรายละเอียดการใช้งาน</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm">Room</div>
            <Select value={roomId} onValueChange={onRoomIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.code} • {room.roomNumber} • ชั้น {room.floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm">วันที่เริ่มต้น</div>
              <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="text-sm">วันที่สิ้นสุด</div>
              <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
            </div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">กำลังค้นหา...</div>
          ) : roomLabel ? (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="text-sm font-medium">
                ผลการค้นหา: {roomLabel} ({from} ถึง {to})
              </div>
              {items.length ? (
                <div className="space-y-2">
                  {items.map((booking) => (
                    <div key={booking.reservationId} className="rounded-md border p-2 text-sm">
                      <div className="font-medium">
                        {booking.courseLabel ?? (booking.type === "AD_HOC" ? "จองนอกตาราง" : "ตารางเรียน")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(booking.startAt)} • {formatTimeRange(booking.startAt, booking.endAt)}
                      </div>
                      <div className="text-xs">ผู้ยืม: {booking.borrowerLabel ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">ผู้จอง: {booking.requesterLabel ?? "-"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">ว่าง (ไม่มีการจองในช่วงเวลานี้)</div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button onClick={onSearch}>ค้นหา</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
