"use client";

import type { Room, Mode } from "../types";
import { Badge } from "@/components/ui/badge";

type Props = {
  mode: Mode | "";
  selectedRoom: Room | null;
};

export default function SelfCheckStatusSummary({ mode, selectedRoom }: Props) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">โหมด: {mode ? (mode === "CHECKIN" ? "ยืมกุญแจ" : "คืนกุญแจ") : "-"}</Badge>
        <Badge variant="outline">
          ห้อง: {selectedRoom ? `${selectedRoom.code} • ${selectedRoom.roomNumber} • ชั้น ${selectedRoom.floor}` : "ทุกห้อง"}
        </Badge>
        <Badge variant="outline">สถานะ: {mode ? "พร้อมทำรายการ" : "-"}</Badge>
      </div>
    </div>
  );
}
