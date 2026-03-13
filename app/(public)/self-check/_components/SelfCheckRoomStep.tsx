"use client";

import type { Mode, Room } from "../types";
import { Badge } from "@/components/ui/badge";
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
      <div>
        <div className="text-sm font-semibold text-stone-900">ขั้นตอน 2: เลือกห้อง (ไม่บังคับ)</div>
        <div className="text-xs text-muted-foreground">
          หากทราบห้องล่วงหน้า การเลือกห้องจะช่วยให้ระบบค้นหารายการได้เร็วและแม่นยำขึ้น
        </div>
      </div>

      {loadingRooms ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          กำลังโหลดรายการห้อง...
        </div>
      ) : roomsByFloor.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          ไม่พบข้อมูลห้องที่พร้อมใช้งาน
        </div>
      ) : (
        roomsByFloor.map((group) => (
          <div key={group.floor} className="space-y-2">
            <div className="text-sm font-semibold">ชั้น {group.floor}</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {group.rooms.map((room) => {
                const disabled = !mode || (mode === "CHECKIN" && room.isBorrowed);
                const selected = roomId === room.id;

                return (
                  <Button
                    key={room.id}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    onClick={() => onRoomToggle(room.id)}
                    disabled={disabled}
                    className="h-auto flex-col items-start gap-2 px-4 py-4 text-left"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {room.code} ห้อง {room.roomNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">{room.name}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={room.isBorrowed ? "destructive" : "secondary"}>
                        {room.isBorrowed ? "มีกุญแจถูกยืมอยู่" : "พร้อมใช้งาน"}
                      </Badge>
                      <Badge variant="outline">ชั้น {room.floor}</Badge>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
