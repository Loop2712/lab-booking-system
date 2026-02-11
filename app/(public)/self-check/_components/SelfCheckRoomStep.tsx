"use client";

import type { Mode, Room } from "../types";
import { Button } from "@/components/ui/button";

type FloorGroup = {
  floor: number;
  rooms: Room[];
};

type Props = {
  mode: Mode | "";
  roomId: string;
  roomsByFloor: FloorGroup[];
  loadingRooms: boolean;
  onRoomToggle: (roomId: string) => void;
};

export default function SelfCheckRoomStep({ mode, roomId, roomsByFloor, loadingRooms, onRoomToggle }: Props) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">ขั้นตอน 2: เลือกห้อง (ไม่บังคับ)</div>
      <div className="text-xs text-muted-foreground">เลือกห้องเพื่อกรองรายการให้แคบลง หากไม่เลือก ระบบจะค้นหาห้องที่ตรงให้โดยอัตโนมัติ</div>
      {loadingRooms ? (
        <div className="text-sm text-muted-foreground">กำลังโหลดรายชื่อห้อง...</div>
      ) : roomsByFloor.length === 0 ? (
        <div className="text-sm text-muted-foreground">ไม่พบข้อมูลห้อง</div>
      ) : (
        roomsByFloor.map((group) => (
          <div key={group.floor} className="space-y-2">
            <div className="text-sm font-semibold">ชั้น {group.floor}</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.rooms.map((room) => (
                <Button
                  key={room.id}
                  type="button"
                  variant={roomId === room.id ? "default" : "outline"}
                  onClick={() => onRoomToggle(room.id)}
                  disabled={!mode || (mode === "CHECKIN" && room.isBorrowed)}
                  className="h-auto items-start justify-start gap-1 px-3 py-3 text-left"
                >
                  <div className="text-sm font-semibold">
                    {room.code} • {room.roomNumber}
                  </div>
                  <div className="text-xs text-muted-foreground">ชั้น {room.floor}</div>
                  <div className={`text-[10px] ${room.isBorrowed ? "text-rose-600" : "text-emerald-700"}`}>
                    {room.isBorrowed ? "กำลังใช้งาน" : "พร้อมใช้งาน"}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
