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
};

type LookupResponse =
  | { ok: true; user: any; room: any; reservation: any; mode: "CHECKIN" | "RETURN" }
  | { ok: false; message: string; detail?: any };

const LS_KEY = "scanner_kiosk_key";
const LS_EXPIRES = "scanner_kiosk_key_expires";
const TOKEN_TTL_MS = 15 * 60 * 60 * 1000;

function formatTime(dt: string) {
  try {
    return new Date(dt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dt;
  }
}

function formatExpire(ts: number | null) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(ts);
  }
}

export default function SelfCheckClient() {
  const [kioskToken, setKioskToken] = useState<string>("");
  const [tokenSaved, setTokenSaved] = useState<boolean>(false);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

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

  const ready = useMemo(() => tokenSaved && !!roomId && !!mode, [tokenSaved, roomId, mode]);
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

  function clearToken() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
      window.localStorage.removeItem(LS_EXPIRES);
    }
    setKioskToken("");
    setTokenSaved(false);
    setTokenExpiresAt(null);
    setTokenError(null);
    setErr(null);
    setRooms([]);
    setRoomId("");
    setLookup(null);
    setToken("");
    setScanOpen(false);
  }

  function loadSavedToken() {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LS_KEY) || "";
    const expiresRaw = window.localStorage.getItem(LS_EXPIRES) || "";
    if (!saved) return;

    const now = Date.now();
    let expiresAt = Number(expiresRaw);
    if (!expiresAt || Number.isNaN(expiresAt)) {
      expiresAt = now + TOKEN_TTL_MS;
      window.localStorage.setItem(LS_EXPIRES, String(expiresAt));
    }

    if (expiresAt <= now) {
      clearToken();
      setTokenError("Kiosk Token หมดอายุแล้ว กรุณาใส่ใหม่");
      return;
    }

    setKioskToken(saved);
    setTokenSaved(true);
    setTokenExpiresAt(expiresAt);
  }

  function saveToken() {
    const value = kioskToken.trim();
    if (!value || typeof window === "undefined") return;
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    window.localStorage.setItem(LS_KEY, value);
    window.localStorage.setItem(LS_EXPIRES, String(expiresAt));
    setTokenSaved(true);
    setTokenExpiresAt(expiresAt);
    setTokenError(null);
  }

  async function fetchRooms(k: string) {
    setLoadingRooms(true);
    setErr(null);
    try {
      const res = await fetch("/api/kiosk/rooms", {
        headers: { "x-scanner-key": k },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if (json?.message === "SCANNER_KEY_INVALID") {
          clearToken();
          setTokenError("Kiosk Token ไม่ถูกต้องหรือหมดอายุแล้ว");
          setLoadingRooms(false);
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
    const k = kioskToken.trim();
    const t = (scannedToken ?? token).trim();
    if (!k || !roomId || !mode || !t) return;

    setLoadingLookup(true);
    setErr(null);
    setLookup(null);

    try {
      const res = await fetch("/api/kiosk/lookup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-scanner-key": k,
        },
        body: JSON.stringify({ roomId, token: t, mode }),
      });

      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "SCANNER_KEY_INVALID") {
          clearToken();
          setTokenError("Kiosk Token ไม่ถูกต้องหรือหมดอายุแล้ว");
          setLoadingLookup(false);
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
    const k = kioskToken.trim();
    const t = token.trim();
    const reservationId = lookup.reservation?.id;

    if (!k || !t || !reservationId) return;

    setConfirming(true);
    setErr(null);

    try {
      const endpoint = lookup.mode === "CHECKIN" ? "/api/kiosk/check-in" : "/api/kiosk/return";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-scanner-key": k,
        },
        body: JSON.stringify({ reservationId, userToken: t }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "SCANNER_KEY_INVALID") {
          clearToken();
          setTokenError("Kiosk Token ไม่ถูกต้องหรือหมดอายุแล้ว");
          setConfirming(false);
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
    if (!tokenSaved || !mode) return;
    setRoomId(id);
    setLookup(null);
    setErr(null);
    setToken("");
    setScanOpen(true);
  }

  useEffect(() => {
    loadSavedToken();
  }, []);

  useEffect(() => {
    if (scanOpen) {
      setTimeout(() => tokenRef.current?.focus(), 0);
    }
  }, [scanOpen]);

  useEffect(() => {
    if (!tokenExpiresAt) return;
    const ms = tokenExpiresAt - Date.now();
    if (ms <= 0) {
      clearToken();
      setTokenError("Kiosk Token หมดอายุแล้ว กรุณาใส่ใหม่");
      return;
    }
    const timer = setTimeout(() => {
      clearToken();
      setTokenError("Kiosk Token หมดอายุแล้ว กรุณาใส่ใหม่");
    }, ms);
    return () => clearTimeout(timer);
  }, [tokenExpiresAt]);

  useEffect(() => {
    if (tokenSaved && kioskToken.trim()) {
      fetchRooms(kioskToken.trim());
    }
  }, [tokenSaved, kioskToken]);

  return (
    <div className="space-y-6">
      {!tokenSaved ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kiosk Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              หน้านี้ใช้ได้เฉพาะสถานที่ที่กำหนดเท่านั้น กรุณาใส่ Kiosk Token
            </div>
            <div className="space-y-1">
              <Label>Kiosk Token</Label>
              <Input
                value={kioskToken}
                onChange={(e) => setKioskToken(e.target.value)}
                placeholder="ใส่ Kiosk Token"
                type="password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveToken} disabled={!kioskToken.trim()}>
                บันทึก Kiosk Token
              </Button>
              <Button variant="outline" onClick={clearToken} disabled={!kioskToken.trim()}>
                ล้าง
              </Button>
            </div>
            {tokenError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {tokenError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kiosk Token ใช้งานอยู่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              หมดอายุเมื่อ: <span className="font-medium text-foreground">{formatExpire(tokenExpiresAt)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearToken}>
                ล้าง Kiosk Token
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ยืม-คืนกุญแจ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>โหมด</Label>
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
              className="flex flex-wrap"
            >
              <ToggleGroupItem value="CHECKIN">ยืมกุญแจ (Check-in)</ToggleGroupItem>
              <ToggleGroupItem value="RETURN">คืนกุญแจ (Check-out)</ToggleGroupItem>
            </ToggleGroup>
            {!mode ? (
              <div className="text-xs text-muted-foreground">กรุณาเลือกโหมดก่อนจึงจะเลือกห้องได้</div>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label>เลือกห้อง</Label>
            {!tokenSaved ? (
              <div className="text-sm text-muted-foreground">กรุณาใส่ Kiosk Token ก่อน</div>
            ) : loadingRooms ? (
              <div className="text-sm text-muted-foreground">กำลังโหลดรายชื่อห้อง...</div>
            ) : roomsByFloor.length === 0 ? (
              <div className="text-sm text-muted-foreground">ไม่พบข้อมูลห้อง</div>
            ) : (
              roomsByFloor.map((group) => (
                <div key={group.floor} className="space-y-2">
                  <div className="text-sm font-semibold">ชั้น {group.floor}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.rooms.map((room) => (
                      <Button
                        key={room.id}
                        type="button"
                        variant={roomId === room.id ? "default" : "outline"}
                        onClick={() => openScanForRoom(room.id)}
                        disabled={!tokenSaved || !mode}
                      >
                        {room.code} • {room.roomNumber}
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
            <div className="text-xs text-muted-foreground">
              กด Enter เพื่อค้นหา หรือกดปุ่ม “ค้นหา”
            </div>
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
            <CardTitle className="text-base">ยืนยันการทำรายการ</CardTitle>
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
