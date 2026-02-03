"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Room = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  isActive?: boolean;
};

type LookupResponse =
  | { ok: true; user: any; room: any; reservation: any; mode: "CHECKIN" | "RETURN" }
  | { ok: false; message: string; detail?: any };

function formatTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

export default function AdminSelfCheckPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [mode, setMode] = useState<"CHECKIN" | "RETURN">("CHECKIN");

  const [token, setToken] = useState<string>("");
  const tokenRef = useRef<HTMLInputElement | null>(null);

  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const ready = useMemo(() => !!roomId, [roomId]);

  async function loadRooms() {
    setLoadingRooms(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/rooms", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setErr(json?.message || "โหลดรายการห้องไม่สำเร็จ");
        setRooms([]);
        setLoadingRooms(false);
        return;
      }

      const activeRooms = (json.rooms ?? []).filter((r: Room) => r.isActive !== false);
      setRooms(activeRooms);
      setLoadingRooms(false);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setRooms([]);
      setLoadingRooms(false);
    }
  }

  async function doLookup(scannedToken?: string) {
    const t = (scannedToken ?? token).trim();
    if (!roomId || !t) return;

    setLoadingLookup(true);
    setErr(null);
    setLookup(null);

    try {
      const res = await fetch("/api/admin/self-check/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId, token: t, mode }),
      });

      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok || !json?.ok) {
        setLookup(json);
        setErr((json as any)?.message || "ค้นหาไม่สำเร็จ");
        setLoadingLookup(false);
        return;
      }

      setLookup(json);
      setLoadingLookup(false);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setLoadingLookup(false);
    }
  }

  async function confirm() {
    if (!lookup || !lookup.ok) return;
    const t = token.trim();
    const reservationId = lookup.reservation?.id;

    if (!t || !reservationId) return;

    setConfirming(true);
    setErr(null);

    try {
      const endpoint = lookup.mode === "CHECKIN" ? "/api/loans/check-in" : "/api/loans/return";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reservationId, userToken: t }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setErr(json?.message || "ยืนยันไม่สำเร็จ");
        setConfirming(false);
        return;
      }

      setLookup(null);
      setToken("");
      setConfirming(false);
      tokenRef.current?.focus();
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setConfirming(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">นักศึกษาเช็คอิน/เช็คเอาต์เอง</h1>
        <p className="text-sm text-muted-foreground">
          หน้านี้สำหรับแอดมินเท่านั้น ใช้ให้ผู้เรียนสแกน QR/Token เพื่อเช็คอินหรือคืนกุญแจด้วยตัวเอง
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">การทำรายการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>โหมด</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKIN">BorrowKey (Check-in)</SelectItem>
                  <SelectItem value="RETURN">ReturnKey (Check-out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Room</Label>
              <Select
                value={roomId}
                onValueChange={(v) => {
                  setRoomId(v);
                  setLookup(null);
                }}
                disabled={loadingRooms}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingRooms ? "กำลังโหลด..." : "เลือกห้อง"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} • {r.roomNumber} • ชั้น {r.floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>สแกน QR / กรอก Token</Label>
            <Input
              ref={tokenRef}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="สแกนแล้ว token จะเข้ามาในช่องนี้"
              disabled={!ready}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLookup(e.currentTarget.value);
              }}
            />
            <div className="text-xs text-muted-foreground">
              กด Enter เพื่อค้นหา หรือกดปุ่ม “ค้นหา”
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => doLookup()} disabled={!ready || !token.trim() || loadingLookup}>
              {loadingLookup ? "กำลังค้นหา..." : "ค้นหา"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setLookup(null);
                setToken("");
                tokenRef.current?.focus();
              }}
              disabled={!ready}
            >
              ล้าง
            </Button>
          </div>

          {err ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {lookup?.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ยืนยันรายการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">Confirm</div>
              <Badge variant="secondary">{lookup.mode}</Badge>
            </div>

            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">User: </span>
                <span className="font-medium">
                  {lookup.user.firstName} {lookup.user.lastName}
                </span>
                {lookup.user.studentId ? (
                  <span className="text-muted-foreground"> • {lookup.user.studentId}</span>
                ) : null}
              </div>

              <div>
                <span className="text-muted-foreground">Room: </span>
                <span className="font-medium">
                  {lookup.room.code} • {lookup.room.roomNumber} • ชั้น {lookup.room.floor}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">ListBooking: </span>
                <span className="font-mono text-xs">{lookup.reservation.id}</span>
              </div>

              <div>
                <span className="text-muted-foreground">วันที่: </span>
                <span className="font-medium">
                  {lookup.reservation.slot} ({formatTime(lookup.reservation.startAt)} -{" "}
                  {formatTime(lookup.reservation.endAt)})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">Status: </span>
                <Badge variant="outline">{lookup.reservation.status}</Badge>
                <span className="text-muted-foreground"> • </span>
                <Badge variant="secondary">{lookup.reservation.type}</Badge>
              </div>
            </div>

            <Button onClick={confirm} disabled={confirming} className="w-full">
              {confirming ? "กำลังยืนยัน..." : lookup.mode === "CHECKIN" ? "ยืนยัน “ยืมกุญแจ”" : "ยืนยัน “คืนกุญแจ”"}
            </Button>

            <div className="text-xs text-muted-foreground">
              ตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
