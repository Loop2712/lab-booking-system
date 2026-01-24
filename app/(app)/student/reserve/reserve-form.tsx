"use client";

import { useState } from "react";
import { TIME_SLOTS } from "@/lib/reserve/slots";
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

type RoomItem = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
};

export default function ReserveForm({ rooms }: { rooms: RoomItem[] }) {
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = roomId && date && slotId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      setError("กรุณาเลือกข้อมูลให้ครบ");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, date, slotId, note: note.trim() || undefined }),
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
          : "จองไม่สำเร็จ กรุณาลองใหม่";

      setError(msg);
      return;
    }

    setSuccess("จองสำเร็จ! รายการของคุณอยู่ในสถานะรออนุมัติ (PENDING)");
    setRoomId("");
    setDate("");
    setSlotId("");
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
        <Label>ช่วงเวลา (รอบละ 4 ชั่วโมง)</Label>
        <Select value={slotId} onValueChange={setSlotId}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกช่วงเวลา" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
