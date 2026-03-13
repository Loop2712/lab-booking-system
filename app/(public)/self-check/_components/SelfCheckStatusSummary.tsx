"use client";

import type { Mode, Room } from "../types";
import { getLoanModeLabel } from "@/lib/loans/messages";

type Props = {
  mode: Mode | "";
  selectedRoom: Room | null;
};

export default function SelfCheckStatusSummary({ mode, selectedRoom }: Props) {
  return (
    <div className="grid gap-3 rounded-2xl border bg-stone-50 p-4 md:grid-cols-3">
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500">โหมด</div>
        <div className="mt-2 text-sm font-semibold text-stone-900">{getLoanModeLabel(mode || null)}</div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ห้องที่เลือก</div>
        <div className="mt-2 text-sm font-semibold text-stone-900">
          {selectedRoom ? `${selectedRoom.code} ห้อง ${selectedRoom.roomNumber}` : "ทุกห้อง"}
        </div>
        <div className="mt-1 text-xs text-stone-600">
          {selectedRoom ? `ชั้น ${selectedRoom.floor}` : "ระบบจะค้นหาห้องที่ตรงกับผู้ใช้ให้อัตโนมัติ"}
        </div>
      </div>
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ความพร้อม</div>
        <div className="mt-2 text-sm font-semibold text-stone-900">
          {mode ? "พร้อมสแกนผู้ใช้" : "รอเลือกโหมด"}
        </div>
        <div className="mt-1 text-xs text-stone-600">
          {mode ? "สแกน QR หรือกรอก Token เพื่อค้นหารายการ" : "เริ่มจากเลือกว่าจะยืมหรือคืนกุญแจ"}
        </div>
      </div>
    </div>
  );
}
