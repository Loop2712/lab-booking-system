"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Room = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  isBorrowed: boolean;
};

type LookupResponse =
  | { ok: true; user: any; room: any; reservation: any; mode: "CHECKIN" | "RETURN" }
  | { ok: false; message: string; detail?: any };

const API_BASE = "/self-check/api";

function formatTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

function redirectNotAllowed() {
  if (typeof window !== "undefined") {
    window.location.href = "/not-allowed";
  }
}

export default function SelfCheckClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [mode, setMode] = useState<"CHECKIN" | "RETURN" | "">("");
  const [scanOpen, setScanOpen] = useState(false);

  const [token, setToken] = useState<string>("");
  const tokenRef = useRef<HTMLInputElement | null>(null);

  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const ready = useMemo(() => !!roomId && !!mode, [roomId, mode]);
  const selectedRoom = useMemo(() => rooms.find((room) => room.id === roomId) ?? null, [rooms, roomId]);
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, Room[]>();
    rooms.forEach((room) => {
      const floor = Number(room.floor ?? 0);
      const list = map.get(floor) ?? [];
      list.push(room);
      map.set(floor, list);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([floor, list]) => ({
        floor,
        rooms: list.sort((a, b) => {
          const aNum = Number(a.roomNumber);
          const bNum = Number(b.roomNumber);
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum;
          return `${a.code} ${a.roomNumber}`.localeCompare(`${b.code} ${b.roomNumber}`);
        }),
      }));
  }, [rooms]);

  async function fetchRooms() {
    setLoadingRooms(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/rooms`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if (json?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setErr(json?.message || "โหลดรายชื่อห้องไม่สำเร็จ");
        setRooms([]);
        setLoadingRooms(false);
        return;
      }
      setRooms(Array.isArray(json.rooms) ? json.rooms : []);
      setLoadingRooms(false);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setRooms([]);
      setLoadingRooms(false);
    }
  }

  async function doLookup(scannedToken?: string) {
    const t = (scannedToken ?? token).trim();
    if (!roomId || !mode || !t) return;

    setLoadingLookup(true);
    setErr(null);
    setLookup(null);

    try {
      const res = await fetch(`${API_BASE}/lookup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId, token: t, mode }),
      });

      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setLookup(json);
        setErr((json as any)?.message || "ค้นหาไม่สำเร็จ");
        setLoadingLookup(false);
        return;
      }

      setLookup(json);
      setLoadingLookup(false);
      setScanOpen(false);
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
      const endpoint = lookup.mode === "CHECKIN" ? `${API_BASE}/check-in` : `${API_BASE}/return`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reservationId, userToken: t }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setErr(json?.message || "ยืนยันไม่สำเร็จ");
        setConfirming(false);
        return;
      }

      setLookup(null);
      setToken("");
      setConfirming(false);
      if (scanOpen) tokenRef.current?.focus();
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setConfirming(false);
    }
  }

  function openScanForRoom(id: string) {
    if (!mode) return;
    setRoomId(id);
    setLookup(null);
    setErr(null);
    setToken("");
    setScanOpen(true);
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (scanOpen) {
      setTimeout(() => tokenRef.current?.focus(), 0);
    }
  }, [scanOpen]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ยืม-คืนกุญแจ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                โหมด: {mode ? (mode === "CHECKIN" ? "ยืมกุญแจ" : "คืนกุญแจ") : "-"}
              </Badge>
              <Badge variant="outline">
                ห้อง:{" "}
                {selectedRoom
                  ? `${selectedRoom.code} • ${selectedRoom.roomNumber} • ชั้น ${selectedRoom.floor}`
                  : "-"}
              </Badge>
              <Badge variant="outline">สถานะ: {mode ? "พร้อมทำรายการ" : "-"}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold">ขั้นตอน 1: เลือกโหมด</div>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => {
                setMode(v as any);
                setRoomId("");
                setLookup(null);
                setErr(null);
                setToken("");
                setScanOpen(false);
              }}
              variant="outline"
              size="sm"
              className="grid w-full grid-cols-2"
            >
              <ToggleGroupItem value="CHECKIN" className="w-full">
                ยืมกุญแจ (Check-in)
              </ToggleGroupItem>
              <ToggleGroupItem value="RETURN" className="w-full">
                คืนกุญแจ (Check-out)
              </ToggleGroupItem>
            </ToggleGroup>
            {!mode ? (
              <div className="text-xs text-muted-foreground">กรุณาเลือกโหมดก่อนจึงจะเลือกห้องได้</div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold">ขั้นตอน 2: เลือกห้อง</div>
            {loadingRooms ? (
              <div className="text-sm text-muted-foreground">กำลังโหลดรายชื่อห้อง...</div>
            ) : roomsByFloor.length === 0 ? (
              <div className="text-sm text-muted-foreground">ไม่พบข้อมูลห้อง</div>
            ) : (
              roomsByFloor.map((group) => (
                <div key={group.floor} className="space-y-2">
                  <div className="text-sm font-semibold">ชั้น {group.floor}</div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.rooms.map((room) => (
                      <Button
                        key={room.id}
                        type="button"
                        variant={roomId === room.id ? "default" : "outline"}
                        onClick={() => openScanForRoom(room.id)}
                        disabled={!mode || (mode === "CHECKIN" && room.isBorrowed)}
                        className="h-auto items-start justify-start gap-1 px-3 py-3 text-left"
                      >
                        <div className="text-sm font-semibold">
                          {room.code} • {room.roomNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">ชั้น {room.floor}</div>
                        <div
                          className={`text-[10px] ${
                            room.isBorrowed ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {room.isBorrowed ? "กำลังใช้งาน" : "พร้อมใช้งาน"}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {!scanOpen && err ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) setErr(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สแกน QR ผู้ใช้</DialogTitle>
          </DialogHeader>

          {selectedRoom ? (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">
                {selectedRoom.code} • {selectedRoom.roomNumber}
              </div>
              <div className="text-xs text-muted-foreground">ชั้น {selectedRoom.floor}</div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label>สแกน QR / ใส่ Token</Label>
            <Input
              ref={tokenRef}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="สแกน token เพื่อค้นหา"
              disabled={!ready}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLookup(e.currentTarget.value);
              }}
            />
            <div className="text-xs text-muted-foreground">กด Enter เพื่อค้นหา หรือกดปุ่ม “ค้นหา”</div>
          </div>

          {scanOpen && err ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>
              ปิด
            </Button>
            <Button onClick={() => doLookup()} disabled={!ready || !token.trim() || loadingLookup}>
              {loadingLookup ? "กำลังค้นหา..." : "ค้นหา"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lookup?.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ขั้นตอน 3: ยืนยันการทำรายการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">ยืนยัน</div>
              <Badge variant="secondary">{lookup.mode}</Badge>
            </div>

            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">ผู้ใช้: </span>
                <span className="font-medium">
                  {lookup.user.firstName} {lookup.user.lastName}
                </span>
                {lookup.user.studentId ? (
                  <span className="text-muted-foreground"> • {lookup.user.studentId}</span>
                ) : null}
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
                  {lookup.reservation.slot} ({formatTime(lookup.reservation.startAt)} -{" "}
                  {formatTime(lookup.reservation.endAt)})
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">สถานะ: </span>
                <Badge variant="outline">{lookup.reservation.status}</Badge>
                <span className="text-muted-foreground"> • </span>
                <Badge variant="secondary">{lookup.reservation.type}</Badge>
              </div>
            </div>

            <Button onClick={confirm} disabled={confirming} className="w-full">
              {confirming
                ? "กำลังยืนยัน..."
                : lookup.mode === "CHECKIN"
                ? "ยืนยัน “ยืมกุญแจ”"
                : "ยืนยัน “คืนกุญแจ”"}
            </Button>

            <div className="text-xs text-muted-foreground">
              ระบบจะบันทึกตามรายการจองและสถานะล่าสุด
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
