"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { areConsecutiveSlots } from "@/lib/reserve/slots";
import { addDaysYmd, todayYmdBkk } from "@/lib/date";
import RoomAvailability from "@/app/(app)/student/reserve/room-availability";
import MyReservationsTable from "@/components/reservations/MyReservationsTable";
import { cn } from "@/lib/utils";

type RoomItem = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
};

type AvailabilitySlot = {
  id: string;
  label: string;
  start: string;
  end: string;
  available: boolean;
  reason?: string | null;
};

type AvailabilityResponse = {
  ok: true;
  slots: AvailabilitySlot[];
  limits: { maxSlots: number; mustConsecutive: boolean };
};

type UserResult = {
  id: string;
  firstName: string;
  lastName: string;
  studentId?: string | null;
  email?: string | null;
};

export default function BookingCenter({
  rooms,
  role,
}: {
  rooms: RoomItem[];
  role: "STUDENT" | "TEACHER" | "ADMIN";
}) {
  const isAutoApprove = role !== "STUDENT";
  const minDate = useMemo(() => todayYmdBkk(), []);
  const maxDate = useMemo(() => addDaysYmd(minDate, 30), [minDate]);

  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [limits, setLimits] = useState({ maxSlots: 2, mustConsecutive: true });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAvailability, setShowAvailability] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [participants, setParticipants] = useState<UserResult[]>([]);
  const remaining = Math.max(0, 4 - participants.length);

  useEffect(() => {
    if (!roomId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setError(null);
    fetch(`/api/rooms/availability?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(date)}`)
      .then((res) => res.json())
      .then((json: AvailabilityResponse & { ok?: boolean; message?: string }) => {
        if (!json?.ok) {
          setError("โหลดช่วงเวลาว่างไม่สำเร็จ");
          setSlots([]);
          return;
        }
        setSlots(json.slots);
        setLimits(json.limits);
        setSelectedSlots([]);
      })
      .catch(() => {
        setError("โหลดช่วงเวลาว่างไม่สำเร็จ");
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [roomId, date]);

  function slotReason(reason?: string | null) {
    if (reason === "ROOM_ALREADY_RESERVED") return "มีผู้จองแล้ว";
    if (reason === "CONFLICT_WITH_CLASS_SCHEDULE") return "ชนตารางเรียน";
    return "ไม่พร้อมใช้งาน";
  }

  function toggleSlot(slotId: string) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    if (!slot.available) {
      setError(slotReason(slot.reason));
      return;
    }
    setError(null);
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) return prev.filter((s) => s !== slotId);
      const next = [...prev, slotId];
      if (next.length > limits.maxSlots) {
        setError(`เลือกได้สูงสุด ${limits.maxSlots} ช่วงเวลา`);
        return prev;
      }
      if (limits.mustConsecutive && !areConsecutiveSlots(next)) {
        setError("ต้องเลือกช่วงเวลาที่ต่อเนื่องกันเท่านั้น");
        return prev;
      }
      return next;
    });
  }

  async function searchUsers() {
    const q = query.trim();
    if (q.length < 2) {
      setError("พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError("ค้นหาผู้ร่วมใช้ไม่สำเร็จ");
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearchResults(Array.isArray(json.items) ? json.items : []);
      setSearching(false);
    } catch {
      setError("ค้นหาผู้ร่วมใช้ไม่สำเร็จ");
      setSearchResults([]);
      setSearching(false);
    }
  }

  function addParticipant(user: UserResult) {
    if (participants.some((p) => p.id === user.id)) return;
    if (participants.length >= 4) {
      setError("เพิ่มผู้ร่วมใช้ได้สูงสุด 4 คน (รวมผู้จองเป็น 5 คน)");
      return;
    }
    setParticipants((prev) => [...prev, user]);
  }

  function removeParticipant(userId: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== userId));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!roomId || !date || selectedSlots.length === 0) {
      setError("กรุณาเลือกห้อง วันที่ และช่วงเวลาให้ครบ");
      return;
    }

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        date,
        slotIds: selectedSlots,
        note: note.trim() || undefined,
        participantIds: participants.map((p) => p.id),
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "ROOM_ALREADY_RESERVED"
          ? "ห้องนี้ถูกจองในช่วงเวลานี้แล้ว"
          : json?.message === "DATE_OUT_OF_RANGE"
          ? "จองได้เฉพาะวันนี้ถึง 30 วันล่วงหน้า"
          : json?.message === "INVALID_SLOT"
          ? "ช่วงเวลาที่เลือกไม่ถูกต้อง"
          : json?.message === "TOO_MANY_SLOTS"
          ? "เลือกได้สูงสุด 2 ช่วงเวลาเท่านั้น"
          : json?.message === "SLOT_NOT_CONSECUTIVE"
          ? "ต้องเลือกช่วงเวลาที่ต่อเนื่องกันเท่านั้น"
          : json?.message === "CONFLICT_WITH_CLASS_SCHEDULE"
          ? "ชนตารางเรียนของห้องนี้ กรุณาเลือกเวลาอื่น"
          : json?.message === "TIME_OUT_OF_RANGE"
          ? "จองได้เฉพาะช่วงเวลา 07:00 - 21:00"
          : json?.message === "PARTICIPANT_LIMIT_EXCEEDED"
          ? "เพิ่มผู้ร่วมใช้ได้สูงสุด 4 คน (รวมผู้จองเป็น 5 คน)"
          : json?.message === "INVALID_PARTICIPANTS"
          ? "พบผู้ร่วมใช้ที่ไม่ถูกต้อง"
          : "จองไม่สำเร็จ กรุณาลองใหม่";
      setError(msg);
      return;
    }

    const statusLabel = json?.statusLabel ?? (isAutoApprove ? "อนุมัติแล้ว" : "รออนุมัติ");
    const nextAction = json?.nextAction ?? (isAutoApprove ? "ไปรับกุญแจได้ตามเวลา" : "รออนุมัติจากอาจารย์");

    setSuccess(`จองสำเร็จ! สถานะ: ${statusLabel} • ขั้นตอนถัดไป: ${nextAction}`);
    setSelectedSlots([]);
    setNote("");
    setParticipants([]);
    setSearchResults([]);
    setQuery("");
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">ศูนย์จองห้อง</h1>
          {isAutoApprove ? <Badge variant="secondary">อนุมัติอัตโนมัติ</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          จองห้อง ดูรายการของฉัน และติดตามสถานะได้ในหน้าเดียว
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <div className="text-sm font-medium">รู้ก่อนจอง</div>
        <ul className="text-xs text-muted-foreground list-disc pl-4">
          <li>IN_CLASS คือการจองจากตารางเรียนที่สร้างไว้แล้ว</li>
          <li>AD_HOC คือการจองนอกตารางเรียน (จองเอง)</li>
          <li>ผู้จอง + ผู้ร่วมใช้ รวมสูงสุด 5 คน</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">จองห้องใหม่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ห้อง</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกห้อง" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.code} • {room.roomNumber} (ชั้น {room.floor})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>วันที่</Label>
                  <Input
                    type="date"
                    value={date}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>ช่วงเวลา (เลือกได้สูงสุด {limits.maxSlots} ช่วง)</Label>
                  {limits.mustConsecutive ? (
                    <Badge variant="outline">ต้องต่อเนื่องกัน</Badge>
                  ) : null}
                </div>
                {loadingSlots ? (
                  <div className="text-sm text-muted-foreground">กำลังโหลดช่วงเวลาว่าง...</div>
                ) : slots.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    เลือกห้องและวันที่เพื่อดูช่วงเวลาว่าง
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => toggleSlot(slot.id)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-sm transition",
                          selectedSlots.includes(slot.id) && "border-emerald-500 bg-emerald-50",
                          !slot.available && "border-dashed text-muted-foreground cursor-not-allowed"
                        )}
                        disabled={!slot.available}
                      >
                        <div className="font-medium">{slot.label}</div>
                        {!slot.available ? (
                          <div className="text-xs">{slotReason(slot.reason)}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">พร้อมจอง</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ (ถ้ามี)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ใช้ทำโปรเจควิชา..."
                />
              </div>

              <div className="space-y-2">
                <Label>ผู้ร่วมใช้ (ไม่เกิน 4 คน)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="พิมพ์รหัสนักศึกษา หรือชื่อ"
                  />
                  <Button type="button" variant="secondary" onClick={searchUsers} disabled={searching}>
                    {searching ? "กำลังค้นหา..." : "ค้นหา"}
                  </Button>
                </div>
                {remaining === 0 ? (
                  <div className="text-xs text-muted-foreground">ครบจำนวนผู้ร่วมใช้แล้ว</div>
                ) : (
                  <div className="text-xs text-muted-foreground">เหลืออีก {remaining} คน</div>
                )}

                {searchResults.length ? (
                  <div className="rounded-lg border p-2 space-y-1">
                    {searchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
                        <div>
                          {u.firstName} {u.lastName}
                          {u.studentId ? ` • ${u.studentId}` : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addParticipant(u)}
                          disabled={participants.length >= 4}
                        >
                          เพิ่ม
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {participants.length ? (
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p) => (
                      <Badge key={p.id} variant="secondary" className="gap-2">
                        {p.firstName} {p.lastName}
                        <button type="button" onClick={() => removeParticipant(p.id)} className="text-xs underline">
                          ลบ
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm">
                  <CheckCircle2 size={18} />
                  {success}
                </div>
              ) : null}

              <Button type="submit" disabled={!roomId || !date || selectedSlots.length === 0}>
                ยืนยันการจอง
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการจองของฉัน</CardTitle>
          </CardHeader>
          <CardContent>
            <MyReservationsTable refreshKey={refreshKey} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Button variant="outline" onClick={() => setShowAvailability((v) => !v)}>
          {showAvailability ? "ซ่อนตารางห้องรายวัน" : "ดูตารางห้องรายวัน"}
        </Button>
        {showAvailability ? <RoomAvailability rooms={rooms} /> : null}
      </div>
    </div>
  );
}
