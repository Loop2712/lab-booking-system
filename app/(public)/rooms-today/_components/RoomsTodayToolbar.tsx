"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  q: string;
  selectedDate: string;
  todayYmd: string;
  onQChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  onOpenRange: () => void;
  onRefresh: () => Promise<void>;
};

export default function RoomsTodayToolbar({
  q,
  selectedDate,
  todayYmd,
  onQChange,
  onDateChange,
  onPrevDate,
  onNextDate,
  onToday,
  onOpenRange,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="ค้นหาห้อง เช่น LAB-1, 401, ชั้น 4..."
          className="max-w-xs bg-white/90"
        />
        <Input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} className="w-[170px] bg-white/90" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onPrevDate}>
          ก่อนหน้า
        </Button>
        <Button variant="secondary" onClick={onToday} disabled={selectedDate === todayYmd}>
          วันนี้
        </Button>
        <Button variant="outline" onClick={onNextDate}>
          ถัดไป
        </Button>
        <Button variant="outline" onClick={onOpenRange}>
          ค้นหาแบบช่วงวันที่
        </Button>
        <Button variant="outline" onClick={onRefresh}>
          รีเฟรช
        </Button>
      </div>
    </div>
  );
}
