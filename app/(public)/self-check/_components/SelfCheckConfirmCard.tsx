"use client";

import type { LookupSuccess } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLoanModeLabel,
  getReservationStatusLabelText,
  getReservationTypeLabel,
} from "@/lib/loans/messages";

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

function formatTime(value: string) {
  try {
    return timeFormatter.format(new Date(value));
  } catch {
    return value;
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">ขั้นตอน 4: ยืนยันรายการ</CardTitle>
            <CardDescription>ตรวจสอบชื่อผู้ใช้ ห้อง และช่วงเวลาให้ถูกต้องก่อนกดยืนยัน</CardDescription>
          </div>
          <Badge variant="secondary">{getLoanModeLabel(lookup.mode)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border bg-stone-50 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ผู้ใช้</div>
            <div className="font-semibold text-stone-900">
              {lookup.user.firstName} {lookup.user.lastName}
            </div>
            <div className="text-xs text-stone-600">
              {lookup.user.studentId || lookup.user.email || lookup.user.role}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ห้อง</div>
            <div className="font-semibold text-stone-900">
              {lookup.room.code} ห้อง {lookup.room.roomNumber}
            </div>
            <div className="text-xs text-stone-600">
              {lookup.room.name} ชั้น {lookup.room.floor}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ช่วงเวลา</div>
            <div className="font-semibold text-stone-900">{lookup.reservation.slot}</div>
            <div className="text-xs text-stone-600">
              {formatTime(lookup.reservation.startAt)} - {formatTime(lookup.reservation.endAt)}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.2em] text-stone-500">ข้อมูลรายการ</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{getReservationTypeLabel(lookup.reservation.type)}</Badge>
              <Badge variant="outline">{getReservationStatusLabelText(lookup.reservation.status)}</Badge>
            </div>
            <div className="text-xs text-stone-600">เลขที่รายการ {lookup.reservation.id}</div>
          </div>
        </div>

        {lookup.candidatesCount > 1 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            พบหลายรายการในวันนี้ ระบบเลือกช่วงเวลาที่ใกล้เวลาปัจจุบันที่สุดให้แล้ว
          </div>
        ) : null}

        <Button onClick={() => void onConfirm()} disabled={confirming} className="w-full">
          {confirming ? "กำลังบันทึกรายการ..." : `ยืนยัน${getLoanModeLabel(lookup.mode)}`}
        </Button>
      </CardContent>
    </Card>
  );
}
