"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LookupResponse, LookupSuccess, Mode, Room } from "./types";
import SelfCheckConfirmCard from "./_components/SelfCheckConfirmCard";
import SelfCheckModeStep from "./_components/SelfCheckModeStep";
import SelfCheckRoomStep from "./_components/SelfCheckRoomStep";
import SelfCheckScanDialog from "./_components/SelfCheckScanDialog";
import SelfCheckStatusSummary from "./_components/SelfCheckStatusSummary";

const API_BASE = "/api/kiosk";

function redirectNotAllowed() {
  if (typeof window !== "undefined") {
    window.location.href = "/not-allowed";
  }
}

export default function SelfCheckClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [mode, setMode] = useState<Mode | "">("");
  const [scanOpen, setScanOpen] = useState(false);

  const [token, setToken] = useState<string>("");
  const tokenRef = useRef<HTMLInputElement | null>(null);

  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const ready = useMemo(() => !!mode, [mode]);
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
        return;
      }
      setRooms(Array.isArray(json.rooms) ? json.rooms : []);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function doLookup(scannedToken?: string) {
    const value = (scannedToken ?? token).trim();
    if (!mode || !value) return;

    setLoadingLookup(true);
    setErr(null);
    setLookup(null);

    try {
      const payload: any = { token: value, mode };
      if (roomId) payload.roomId = roomId;

      const res = await fetch(`${API_BASE}/lookup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setLookup(json);
        setErr((json as any)?.message || "ค้นหาไม่สำเร็จ");
        return;
      }

      setLookup(json);
      setScanOpen(false);
    } catch (e: any) {
      setErr(e?.message || "ERROR");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function confirm() {
    if (!lookup || !lookup.ok) return;
    const value = token.trim();
    const reservationId = lookup.reservation?.id;
    if (!value || !reservationId) return;

    setConfirming(true);
    setErr(null);

    try {
      const endpoint = lookup.mode === "CHECKIN" ? `${API_BASE}/check-in` : `${API_BASE}/return`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reservationId, userToken: value }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if ((json as any)?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setErr(json?.message || "ยืนยันไม่สำเร็จ");
        return;
      }

      setLookup(null);
      setToken("");
      if (scanOpen) tokenRef.current?.focus();
    } catch (e: any) {
      setErr(e?.message || "ERROR");
    } finally {
      setConfirming(false);
    }
  }

  function openScan(selectedRoomId?: string) {
    if (!mode) return;
    if (selectedRoomId) setRoomId(selectedRoomId);
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
          <SelfCheckStatusSummary mode={mode} selectedRoom={selectedRoom} />

          <SelfCheckModeStep
            mode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              setRoomId("");
              setLookup(null);
              setErr(null);
              setToken("");
              setScanOpen(false);
            }}
          />

          <SelfCheckRoomStep
            mode={mode}
            roomId={roomId}
            roomsByFloor={roomsByFloor}
            loadingRooms={loadingRooms}
            onRoomToggle={(nextRoomId) => {
              setRoomId((prev) => (prev === nextRoomId ? "" : nextRoomId));
              setLookup(null);
              setErr(null);
            }}
          />

          <div className="space-y-3">
            <div className="text-sm font-semibold">ขั้นตอน 3: สแกนผู้ใช้</div>
            <Button onClick={() => openScan()} disabled={!mode}>
              เปิดหน้าสแกน
            </Button>
            <div className="text-xs text-muted-foreground">สแกน QR/ใส่ Token ของผู้ใช้ ระบบจะแนะนำรายการให้ทันที</div>
          </div>

          {!scanOpen && err ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{err}</div>
          ) : null}
        </CardContent>
      </Card>

      <SelfCheckScanDialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) setErr(null);
        }}
        selectedRoom={selectedRoom}
        ready={ready}
        token={token}
        tokenRef={tokenRef}
        loadingLookup={loadingLookup}
        err={err}
        onTokenChange={setToken}
        onLookup={doLookup}
      />

      {lookup?.ok ? <SelfCheckConfirmCard lookup={lookup as LookupSuccess} confirming={confirming} onConfirm={confirm} /> : null}
    </div>
  );
}
