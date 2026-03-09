"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  fetchLoansQueue,
  checkIn as checkInService,
  returnKey as returnKeyService,
  lookupReservation as lookupReservationService,
} from "@/lib/services/loans";
import type { ReservationRow, LookupResult } from "@/lib/services/loans";

const LOOKUP_ERROR_MESSAGES: Record<string, string> = {
  NO_MATCHING_RESERVATION: "ไม่พบรายการที่ตรงกับผู้ใช้",
  NO_MATCHING_CHECKEDIN_RESERVATION: "ไม่พบรายการที่กำลังยืมอยู่",
  NO_MATCHING_APPROVED_RESERVATION: "ไม่พบรายการที่อนุมัติแล้วสำหรับวันนี้",
  BAD_QR_TOKEN: "QR Token ไม่ถูกต้อง",
};

function ymd(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function LoanDesk({ title }: { title: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pendingCheckin, setPendingCheckin] = useState<ReservationRow[]>([]);
  const [activeLoans, setActiveLoans] = useState<ReservationRow[]>([]);
  const [scanToken, setScanToken] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoansQueue();
      setPendingCheckin(data.pendingCheckin ?? []);
      setActiveLoans(data.activeLoans ?? []);
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? "";
      setError(
        msg.includes("401") || msg.includes("UNAUTHORIZED")
          ? "ไม่มีสิทธิ์ใช้งาน (ต้องเป็น TEACHER หรือ ADMIN)"
          : msg || "โหลดข้อมูลไม่สำเร็จ"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function checkIn(reservationId: string) {
    const token = scanToken.trim();
    if (token.length < 10) {
      setError("กรุณาสแกน/วาง QR Token ก่อน");
      return;
    }
    setBusyId(reservationId);
    setError(null);
    try {
      await checkInService(reservationId, token);
      await load();
      setLookup(null);
      setLookupError(null);
      setScanToken("");
    } catch (e: unknown) {
      setError(`เช็คอินไม่สำเร็จ: ${(e as Error)?.message ?? ""}`);
    } finally {
      setBusyId(null);
    }
  }

  async function returnKey(reservationId: string) {
    const token = scanToken.trim();
    if (token.length < 10) {
      setError("กรุณาสแกน/วาง QR Token ก่อน");
      return;
    }
    setBusyId(reservationId);
    setError(null);
    try {
      await returnKeyService(reservationId, token);
      await load();
      setLookup(null);
      setLookupError(null);
      setScanToken("");
    } catch (e: unknown) {
      setError(`คืนกุญแจไม่สำเร็จ: ${(e as Error)?.message ?? ""}`);
    } finally {
      setBusyId(null);
    }
  }

  async function lookupReservation() {
    const token = scanToken.trim();
    if (token.length < 10) {
      setLookupError("กรุณาสแกน/วาง QR Token ก่อน");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookup(null);
    try {
      const result = await lookupReservationService(token);
      setLookup(result);
    } catch (e: unknown) {
      const err = e as { detail?: { message?: string }; message?: string };
      const code = err?.detail?.message ?? err?.message;
      setLookupError(LOOKUP_ERROR_MESSAGES[code ?? ""] ?? "ค้นหาไม่สำเร็จ");
    } finally {
      setLookupLoading(false);
    }
  }


  const pendingRows = useMemo(() => pendingCheckin, [pendingCheckin]);
  const activeRows = useMemo(() => activeLoans, [activeLoans]);

  if (loading) return <div className="text-sm text-muted-foreground">กำลังโหลด...</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          จัดการ “รับกุญแจ (Check-in)” และ “คืนกุญแจ (Return)”
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">สแกน/วาง QR Token ของผู้ยืม/ผู้คืน</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
            placeholder="วาง token ที่ได้จากหน้า /student/qr"
            value={scanToken}
            onChange={(e) => {
              setScanToken(e.target.value);
              setLookupError(null);
            }}
          />
          <Button
            type="button"
            onClick={lookupReservation}
            disabled={lookupLoading}
            variant="secondary"
          >
            {lookupLoading ? "กำลังค้นหา..." : "ค้นหารายการอัตโนมัติ"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          ระบบจะแนะนำรายการที่ตรงกับผู้ใช้โดยอัตโนมัติ เพื่อลดการเลือกผิดรายการ
        </div>
        {lookupError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {lookupError}
          </div>
        ) : null}
      </div>

      {lookup ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">รายการที่ระบบแนะนำ</div>
            <Badge variant="secondary">{lookup.mode === "CHECKIN" ? "รับกุญแจ" : "คืนกุญแจ"}</Badge>
          </div>
          <div className="text-sm space-y-1">
            <div>
              ผู้ใช้: {lookup.user.firstName} {lookup.user.lastName}
              {lookup.user.studentId ? ` • ${lookup.user.studentId}` : null}
            </div>
            <div>
              ห้อง: {lookup.reservation.room.code} • {lookup.reservation.room.roomNumber} (ชั้น{" "}
              {lookup.reservation.room.floor})
            </div>
            <div>
              เวลา: {lookup.reservation.slot} ({formatTime(lookup.reservation.startAt)} -{" "}
              {formatTime(lookup.reservation.endAt)})
            </div>
          </div>
          <Button
            onClick={() =>
              lookup.mode === "CHECKIN"
                ? checkIn(lookup.reservation.id)
                : returnKey(lookup.reservation.id)
            }
            disabled={busyId === lookup.reservation.id}
          >
            {busyId === lookup.reservation.id
              ? "กำลังทำรายการ..."
              : lookup.mode === "CHECKIN"
              ? "ยืนยันรับกุญแจ"
              : "ยืนยันคืนกุญแจ"}
          </Button>
          {lookup.candidatesCount > 1 ? (
            <div className="text-xs text-muted-foreground">
              พบหลายรายการ ระบบเลือกช่วงเวลาที่ใกล้ปัจจุบันที่สุด
            </div>
          ) : null}
        </div>
      ) : null}


      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={load}>รีเฟรช</Button>
      </div>

      {/* รอรับกุญแจ */}
      <div className="space-y-2">
        <h2 className="font-semibold">รอรับกุญแจ (APPROVED)</h2>
        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ขอ</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>ช่วงเวลา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การทำงาน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ไม่มีรายการรอรับกุญแจ
                  </TableCell>
                </TableRow>
              ) : (
                pendingRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.requester.firstName} {r.requester.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.requester.studentId ?? r.requester.email ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.room.code} • {r.room.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.room.roomNumber} ชั้น {r.room.floor}
                      </div>
                    </TableCell>
                    <TableCell>{ymd(r.startAt)}</TableCell>
                    <TableCell><span className="font-mono text-sm">{r.slot}</span></TableCell>
                    <TableCell><Badge>APPROVED</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => checkIn(r.id)}
                      >
                        {busyId === r.id ? "กำลังเช็คอิน..." : "รับกุญแจ"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* กำลังยืม */}
      <div className="space-y-2">
        <h2 className="font-semibold">กำลังยืม (CHECKED_IN)</h2>
        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ยืม</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>ช่วงเวลา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การทำงาน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ไม่มีรายการที่กำลังยืม
                  </TableCell>
                </TableRow>
              ) : (
                activeRows.map((r) => {
                  const borrower = r.loan?.borrower ?? r.requester;
                  return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{borrower.firstName} {borrower.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {borrower.studentId ?? borrower.email ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.room.code} • {r.room.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.room.roomNumber} ชั้น {r.room.floor}
                      </div>
                    </TableCell>
                    <TableCell>{ymd(r.startAt)}</TableCell>
                    <TableCell><span className="font-mono text-sm">{r.slot}</span></TableCell>
                    <TableCell><Badge variant="secondary">CHECKED_IN</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => returnKey(r.id)}
                      >
                        {busyId === r.id ? "กำลังคืน..." : "คืนกุญแจ"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
