"use client";

import type { LookupSuccess } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

type Props = {
  lookup: LookupSuccess;
  confirming: boolean;
  onConfirm: () => Promise<void>;
};

export default function SelfCheckConfirmCard({ lookup, confirming, onConfirm }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ขั้นตอน 3: ยืนยันการทำรายการ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">ยืนยัน</div>
          <Badge variant="secondary">{lookup.mode === "CHECKIN" ? "ยืมกุญแจ" : "คืนกุญแจ"}</Badge>
        </div>

        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">ผู้ใช้: </span>
            <span className="font-medium">
              {lookup.user.firstName} {lookup.user.lastName}
            </span>
            {lookup.user.studentId ? <span className="text-muted-foreground"> • {lookup.user.studentId}</span> : null}
          </div>

          <div>
            <span className="text-muted-foreground">ห้อง: </span>
            <span className="font-medium">
              {lookup.room.code} • {lookup.room.roomNumber} • ชั้น {lookup.room.floor}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground">รายการจอง: </span>
            <span className="font-mono text-xs">{lookup.reservation.id}</span>
          </div>

          <div>
            <span className="text-muted-foreground">ช่วงเวลา: </span>
            <span className="font-medium">
              {lookup.reservation.slot} ({formatTime(lookup.reservation.startAt)} - {formatTime(lookup.reservation.endAt)})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground">สถานะ: </span>
            <Badge variant="outline">{lookup.reservation.status}</Badge>
            <span className="text-muted-foreground"> • </span>
            <Badge variant="secondary">{lookup.reservation.type}</Badge>
          </div>
        </div>

        <Button onClick={onConfirm} disabled={confirming} className="w-full">
          {confirming ? "กำลังยืนยัน..." : lookup.mode === "CHECKIN" ? "ยืนยัน “ยืมกุญแจ”" : "ยืนยัน “คืนกุญแจ”"}
        </Button>

        <div className="text-xs text-muted-foreground">ระบบจะบันทึกตามรายการจองและสถานะล่าสุด</div>
      </CardContent>
    </Card>
  );
}
