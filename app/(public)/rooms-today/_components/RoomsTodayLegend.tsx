"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  date: string | undefined;
  lastUpdated: Date | null;
};

export default function RoomsTodayLegend({ date, lastUpdated }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-2">
        <Badge className="h-7 px-3 text-[11px] bg-emerald-600/90 text-white">มีเรียน</Badge>
        <Badge className="h-7 px-3 text-[11px] bg-rose-600/90 text-white">จอง</Badge>
        <Badge className="h-7 px-3 text-[11px] bg-muted text-foreground">ว่าง</Badge>
      </div>
      <div>
        {date ? (
          <>
            วันที่: <span className="font-semibold">{date}</span>
            {lastUpdated ? (
              <>
                {" "}
                • อัปเดตล่าสุด:{" "}
                <span className="font-semibold">
                  {lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
