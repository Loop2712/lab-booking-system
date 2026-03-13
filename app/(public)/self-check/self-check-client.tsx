"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LookupResponse, LookupSuccess, Mode, Room } from "./types";
import SelfCheckConfirmCard from "./_components/SelfCheckConfirmCard";
import SelfCheckModeStep from "./_components/SelfCheckModeStep";
import SelfCheckRoomStep from "./_components/SelfCheckRoomStep";
import SelfCheckScanDialog from "./_components/SelfCheckScanDialog";
import SelfCheckStatusSummary from "./_components/SelfCheckStatusSummary";
import { getLoanActionMessage, getLoanLookupMessage, getLoanModeLabel } from "@/lib/loans/messages";

const API_BASE = "/api/kiosk";

function redirectNotAllowed() {
  if (typeof window !== "undefined") {
    window.location.href = "/not-allowed";
  }
}

function groupRoomsByFloor(rooms: Room[]) {
  const map = new Map<number, Room[]>();

  rooms.forEach((room) => {
    const floor = Number(room.floor ?? 0);
    const list = map.get(floor) ?? [];
    list.push(room);
    map.set(floor, list);
  });

  return Array.from(map.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([floor, items]) => ({
      floor,
      rooms: items.sort((left, right) => {
        const leftNum = Number(left.roomNumber);
        const rightNum = Number(right.roomNumber);
        if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum) && leftNum !== rightNum) {
          return leftNum - rightNum;
        }
        return `${left.code} ${left.roomNumber}`.localeCompare(`${right.code} ${right.roomNumber}`);
      }),
    }));
}

export default function SelfCheckClient() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState<Mode | "">("");
  const [scanOpen, setScanOpen] = useState(false);

  const [token, setToken] = useState("");
  const tokenRef = useRef<HTMLInputElement | null>(null);

  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const ready = Boolean(mode);
  const selectedRoom = rooms.find((room) => room.id === roomId) ?? null;
  const roomsByFloor = groupRoomsByFloor(rooms);

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
        setErr(getLoanLookupMessage(json?.message, (json as { reason?: string })?.reason));
        setRooms([]);
        return;
      }
      setRooms(Array.isArray(json.rooms) ? json.rooms : []);
    } catch (e: any) {
      setErr(e?.message || "โหลดรายการห้องไม่สำเร็จ");
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
    setNotice(null);
    setLookup(null);

    try {
      const payload: Record<string, string> = { token: value, mode };
      if (roomId) payload.roomId = roomId;

      const res = await fetch(`${API_BASE}/lookup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as LookupResponse;
      if (!res.ok || !json?.ok) {
        if ((json as { message?: string })?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setLookup(json);
        setErr(
          getLoanLookupMessage(
            (json as { message?: string })?.message,
            (json as { reason?: string })?.reason
          )
        );
        return;
      }

      setToken(value);
      setLookup(json);
      setScanOpen(false);
    } catch (e: any) {
      setErr(e?.message || "ค้นหารายการไม่สำเร็จ");
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
    setNotice(null);

    try {
      const endpoint = lookup.mode === "CHECKIN" ? `${API_BASE}/check-in` : `${API_BASE}/return`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reservationId, userToken: value }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if (json?.message === "KIOSK_DEVICE_INVALID") {
          redirectNotAllowed();
          return;
        }
        setErr(getLoanActionMessage(json?.message, lookup.mode, json?.reason));
        return;
      }

      setLookup(null);
      setToken("");
      setScanOpen(false);
      setNotice(`${getLoanModeLabel(lookup.mode)}สำเร็จแล้ว`);
    } catch (e: any) {
      setErr(e?.message || "บันทึกรายการไม่สำเร็จ");
    } finally {
      setConfirming(false);
    }
  }

  function openScan(nextRoomId?: string) {
    if (!mode) return;

    if (nextRoomId) {
      setRoomId(nextRoomId);
    }

    setLookup(null);
    setErr(null);
    setNotice(null);
    setToken("");
    setScanOpen(true);
  }

  useEffect(() => {
    void fetchRooms();
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
          <CardTitle className="text-base">ทำรายการยืม-คืนกุญแจ</CardTitle>
          <CardDescription>
            เลือกโหมด เลือกห้องถ้าจำเป็น แล้วสแกน QR ของผู้ใช้เพื่อให้ระบบค้นหารายการให้อัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SelfCheckStatusSummary mode={mode} selectedRoom={selectedRoom} />

          {notice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {notice}
            </div>
          ) : null}

          {!scanOpen && err ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {err}
            </div>
          ) : null}

          <SelfCheckModeStep
            mode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              setRoomId("");
              setLookup(null);
              setErr(null);
              setNotice(null);
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
              setNotice(null);
            }}
          />

          <div className="rounded-2xl border bg-stone-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-stone-900">ขั้นตอน 3: สแกนผู้ใช้</div>
                <div className="text-xs text-stone-600">
                  ระบบจะค้นหารายการที่ใกล้เวลาปัจจุบันที่สุดให้โดยอัตโนมัติ
                </div>
              </div>
              <Button onClick={() => openScan()} disabled={!mode}>
                เปิดหน้าสแกน
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SelfCheckScanDialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) {
            setErr(null);
          }
        }}
        selectedRoom={selectedRoom}
        ready={ready}
        token={token}
        tokenRef={tokenRef}
        loadingLookup={loadingLookup}
        err={err}
        onTokenChange={setToken}
        onLookup={doLookup}
        onUploadDecode={async (decoded) => {
          setToken(decoded);
          await doLookup(decoded);
        }}
      />

      {lookup?.ok ? (
        <SelfCheckConfirmCard
          lookup={lookup as LookupSuccess}
          confirming={confirming}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  );
}
