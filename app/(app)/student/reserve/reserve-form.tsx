"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type RoomItem = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
};

export default function ReserveForm({ rooms }: { rooms: RoomItem[] }) {
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = roomId && date && startTime && endTime;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      setError("กรุณาเลือกข้อมูลให้ครบ");
      return;
    }

    if (!startTime || !endTime) {
      setError("กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุด");
      return;
    }

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (endMin <= startMin) {
      setError("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
      return;
    }
    if (startMin < 7 * 60 || endMin > 21 * 60) {
      setError("จองได้เฉพาะช่วงเวลา 07:00 - 21:00");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        date,
        startTime,
        endTime,
        note: note.trim() || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "ROOM_ALREADY_RESERVED"
          ? "ห้องนี้ถูกจองในช่วงเวลานี้แล้ว"
          : json?.message === "DATE_OUT_OF_RANGE"
          ? "จองได้เฉพาะวันนี้ถึง 30 วันล่วงหน้า"
          : json?.message === "INVALID_SLOT"
          ? "ช่วงเวลาไม่ถูกต้อง"
          : json?.message === "TOO_MANY_SLOTS"
          ? "จองได้สูงสุด 2 รอบต่อเนื่องเท่านั้น"
          : json?.message === "SLOT_NOT_CONSECUTIVE"
          ? "ต้องเลือกช่วงเวลาที่ต่อเนื่องกันเท่านั้น"
          : json?.message === "INVALID_TIME_FORMAT"
          ? "รูปแบบเวลาไม่ถูกต้อง"
          : json?.message === "INVALID_TIME_RANGE"
          ? "ช่วงเวลาไม่ถูกต้อง"
          : json?.message === "CONFLICT_WITH_CLASS_SCHEDULE"
          ? "ช่วงเวลานี้ทับกับตารางเรียนของห้องนี้ กรุณาเลือกเวลาอื่น"
          : json?.message === "TIME_OUT_OF_RANGE"
          ? "จองได้เฉพาะช่วงเวลา 07:00 - 21:00"
          : "จองไม่สำเร็จ กรุณาลองใหม่";

      setError(msg);
      return;
    }

    setSuccess(
      `จองสำเร็จ! ${startTime} - ${endTime} รายการของคุณอยู่ในสถานะรออนุมัติ (PENDING)`
    );
    setRoomId("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setNote("");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-5">
      <div className="space-y-2">
        <Label>Room</Label>
        <Select value={roomId} onValueChange={setRoomId}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกห้อง" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.code} • {r.name} • {r.roomNumber} (ชั้น {r.floor})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>วันที่</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>เวลาเริ่มต้น</Label>
        <Input
          type="time"
          min="07:00"
          max="21:00"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>เวลาสิ้นสุด</Label>
        <Input
          type="time"
          min="07:00"
          max="21:00"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>หมายเหตุ (ถ้ามี)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ใช้ทำโปรเจควิชา..." />
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <Button type="submit" disabled={!canSubmit || loading}>
        {loading ? "กำลังบันทึก..." : "ยืนยันการจอง"}
      </Button>
    </form>
  );
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
