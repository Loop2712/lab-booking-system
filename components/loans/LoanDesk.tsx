"use client";

import { useEffect, useState } from "react";
import QrImageUploadField from "@/components/qr/QrImageUploadField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getLoanActionMessage,
  getLoanLookupMessage,
  getLoanModeLabel,
  getReservationStatusLabelText,
  getReservationTypeLabel,
} from "@/lib/loans/messages";
import {
  checkIn as checkInService,
  fetchLoansQueue,
  lookupReservation as lookupReservationService,
  returnKey as returnKeyService,
} from "@/lib/services/loans";
import type { LookupResult, ReservationRow } from "@/lib/services/loans";

const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
});

function formatDate(iso: string) {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return timeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function getUserMeta(user: {
  studentId?: string | null;
  email?: string | null;
}) {
  return user.studentId ?? user.email ?? "-";
}

function getErrorCode(error: unknown) {
  const detail = (error as { detail?: { message?: string } })?.detail;
  return detail?.message ?? (error as { message?: string })?.message ?? null;
}

function getErrorReason(error: unknown) {
  const detail = (error as { detail?: { reason?: string } })?.detail;
  return detail?.reason ?? null;
}

function getStatusVariant(status: string) {
  if (status === "APPROVED") return "secondary" as const;
  if (status === "CHECKED_IN") return "default" as const;
  if (status === "COMPLETED") return "outline" as const;
  return "outline" as const;
}

function isPastLateLimit(iso: string) {
  const startedAt = new Date(iso);
  if (Number.isNaN(startedAt.getTime())) return false;
  return Date.now() > startedAt.getTime() + 30 * 60 * 1000;
}

type LoanDeskProps = {
  title: string;
  allowLateOverride?: boolean;
};

export default function LoanDesk({ title, allowLateOverride = false }: LoanDeskProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCheckin, setPendingCheckin] = useState<ReservationRow[]>([]);
  const [activeLoans, setActiveLoans] = useState<ReservationRow[]>([]);
  const [scanToken, setScanToken] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lateOverrideEnabled, setLateOverrideEnabled] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoansQueue();
      setPendingCheckin(data.pendingCheckin ?? []);
      setActiveLoans(data.activeLoans ?? []);
    } catch (e: unknown) {
      const code = getErrorCode(e);
      const reason = getErrorReason(e);
      setError(code ? getLoanLookupMessage(code, reason) : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(reservationId: string) {
    const token = scanToken.trim();
    if (token.length < 10) {
      setError("กรุณาสแกน QR หรือวาง Token ของผู้ใช้ก่อน");
      return;
    }

    setBusyId(reservationId);
    setError(null);
    try {
      await checkInService(reservationId, token, { allowLateOverride: lateOverrideEnabled });
      await load();
      setLookup(null);
      setLookupError(null);
      setScanToken("");
    } catch (e: unknown) {
      setError(getLoanActionMessage(getErrorCode(e), "CHECKIN", getErrorReason(e)));
    } finally {
      setBusyId(null);
    }
  }

  async function returnKey(reservationId: string) {
    const token = scanToken.trim();
    if (token.length < 10) {
      setError("กรุณาสแกน QR หรือวาง Token ของผู้ใช้ก่อน");
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
      setError(getLoanActionMessage(getErrorCode(e), "RETURN", getErrorReason(e)));
    } finally {
      setBusyId(null);
    }
  }

  async function lookupReservation(nextToken?: string) {
    const token = (nextToken ?? scanToken).trim();
    if (token.length < 10) {
      setLookupError("กรุณาสแกน QR หรือวาง Token ของผู้ใช้ก่อน");
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setLookup(null);
    try {
      const result = await lookupReservationService(token, {
        allowLateOverride: lateOverrideEnabled,
      });
      setScanToken(token);
      setLookup(result);
    } catch (e: unknown) {
      setLookupError(getLoanLookupMessage(getErrorCode(e), getErrorReason(e)));
    } finally {
      setLookupLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">กำลังโหลดรายการยืม-คืนกุญแจ...</p>
      </div>
    );
  }

  const usesLateOverride =
    allowLateOverride &&
    lateOverrideEnabled &&
    lookup?.mode === "CHECKIN" &&
    isPastLateLimit(lookup.reservation.startAt);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          สแกน QR ของผู้ใช้เพื่อค้นหารายการอัตโนมัติ และยืนยันการรับหรือคืนกุญแจจากหน้าจอเดียว
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>รอรับกุญแจ</CardDescription>
            <CardTitle className="text-3xl">{pendingCheckin.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>กำลังยืมอยู่</CardDescription>
            <CardTitle className="text-3xl">{activeLoans.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>ผลการค้นหาล่าสุด</CardDescription>
            <CardTitle className="text-xl">
              {lookup ? getLoanModeLabel(lookup.mode) : "ยังไม่ได้ค้นหา"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ค้นหารายการด้วย QR / Token</CardTitle>
          <CardDescription>
            ใช้สำหรับค้นหารายการที่ตรงกับผู้ใช้ในเวลานั้น แล้วกดยืนยันการยืมหรือคืนได้ทันที
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allowLateOverride ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="admin-late-override" className="text-sm font-semibold text-stone-900">
                    สิทธิ์แอดมิน: รับกุญแจเกินเวลา 30 นาที
                  </Label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    เมื่อเปิดใช้ ระบบจะรวมรายการที่เลยเวลาและถูกปรับเป็นไม่มาใช้งานแล้วไว้ในการค้นหาด้วย
                    แต่ยังต้องสแกน QR ของนักศึกษาที่มีสิทธิ์ในรายการนั้นเท่านั้น
                  </p>
                </div>
                <Switch
                  id="admin-late-override"
                  checked={lateOverrideEnabled}
                  onCheckedChange={(checked) => {
                    setLateOverrideEnabled(checked);
                    setLookup(null);
                    setLookupError(null);
                    setError(null);
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={scanToken}
              onChange={(e) => {
                setScanToken(e.target.value);
                setLookupError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void lookupReservation();
                }
              }}
              placeholder="สแกนหรือวาง token ของผู้ใช้"
              className="font-mono"
            />
            <Button type="button" onClick={() => void lookupReservation()} disabled={lookupLoading} variant="secondary">
              {lookupLoading ? "กำลังค้นหา..." : "ค้นหารายการ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setScanToken("");
                setLookup(null);
                setLookupError(null);
              }}
            >
              ล้างค่า
            </Button>
          </div>

          <QrImageUploadField
            title="อัปโหลดรูป QR ของผู้ใช้"
            description="เหมาะสำหรับกรณียังไม่มีหัวสแกน สามารถใช้ภาพ screenshot หรือรูปถ่าย QR แทนได้"
            disabled={lookupLoading}
            onDecoded={async (decoded) => {
              setLookupError(null);
              setError(null);
              await lookupReservation(decoded);
            }}
          />

          {lookupError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {lookupError}
            </div>
          ) : null}

          {lookup ? (
            <div className="rounded-2xl border bg-stone-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{getLoanModeLabel(lookup.mode)}</Badge>
                    <Badge variant="outline">{getReservationTypeLabel(lookup.reservation.type)}</Badge>
                    <Badge variant="outline">{getReservationStatusLabelText(lookup.reservation.status)}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">
                      {lookup.user.firstName} {lookup.user.lastName}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {lookup.user.studentId || lookup.user.email || "-"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lookup.reservation.room.code} ห้อง {lookup.reservation.room.roomNumber} ชั้น{" "}
                    {lookup.reservation.room.floor}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lookup.reservation.slot} ({formatTime(lookup.reservation.startAt)} -{" "}
                    {formatTime(lookup.reservation.endAt)})
                  </div>
                  {lookup.candidatesCount > 1 ? (
                    <div className="text-xs text-muted-foreground">
                      พบหลายรายการ ระบบเลือกช่วงเวลาที่ใกล้เวลาปัจจุบันที่สุดให้แล้ว
                    </div>
                  ) : null}
                  {usesLateOverride ? (
                    <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      รายการนี้เลยเวลาเช็กอินปกติแล้ว แต่แอดมินยังยืนยันรับกุญแจได้เมื่อ QR เป็นของนักศึกษาที่มีสิทธิ์
                    </div>
                  ) : null}
                </div>

                <Button
                  onClick={() =>
                    lookup.mode === "CHECKIN"
                      ? void checkIn(lookup.reservation.id)
                      : void returnKey(lookup.reservation.id)
                  }
                  disabled={busyId === lookup.reservation.id}
                >
                  {busyId === lookup.reservation.id
                    ? "กำลังบันทึกรายการ..."
                    : usesLateOverride
                      ? "ยืนยันรับกุญแจแบบข้ามเวลา"
                      : `ยืนยัน${getLoanModeLabel(lookup.mode)}`}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void load()}>
          รีเฟรชรายการ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการรอรับกุญแจ</CardTitle>
          <CardDescription>แสดงเฉพาะรายการที่อนุมัติแล้วและยังไม่ได้รับกุญแจ</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-2xl border px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ประเภท</TableHead>
                <TableHead>ผู้เกี่ยวข้อง</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันเวลา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การทำรายการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCheckin.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ไม่มีรายการรอรับกุญแจ
                  </TableCell>
                </TableRow>
              ) : (
                pendingCheckin.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <Badge variant="outline">{getReservationTypeLabel(reservation.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {reservation.requester.firstName} {reservation.requester.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{getUserMeta(reservation.requester)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {reservation.room.code} ห้อง {reservation.room.roomNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {reservation.room.name} ชั้น {reservation.room.floor}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(reservation.startAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {reservation.slot} ({formatTime(reservation.startAt)} -{" "}
                        {formatTime(reservation.endAt)})
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(reservation.status)}>
                        {getReservationStatusLabelText(reservation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={busyId === reservation.id} onClick={() => void checkIn(reservation.id)}>
                        {busyId === reservation.id ? "กำลังบันทึก..." : "รับกุญแจ"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการที่กำลังยืมอยู่</CardTitle>
          <CardDescription>แสดงรายการที่รับกุญแจแล้วและยังไม่ได้คืน</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-2xl border px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ประเภท</TableHead>
                <TableHead>ผู้ยืม</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันเวลา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การทำรายการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ไม่มีรายการที่กำลังยืมอยู่
                  </TableCell>
                </TableRow>
              ) : (
                activeLoans.map((reservation) => {
                  const borrower = reservation.loan?.borrower ?? reservation.requester;
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <Badge variant="outline">{getReservationTypeLabel(reservation.type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {borrower.firstName} {borrower.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{getUserMeta(borrower)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {reservation.room.code} ห้อง {reservation.room.roomNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reservation.room.name} ชั้น {reservation.room.floor}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(reservation.startAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {reservation.slot} ({formatTime(reservation.startAt)} -{" "}
                          {formatTime(reservation.endAt)})
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(reservation.status)}>
                          {getReservationStatusLabelText(reservation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === reservation.id}
                          onClick={() => void returnKey(reservation.id)}
                        >
                          {busyId === reservation.id ? "กำลังบันทึก..." : "คืนกุญแจ"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
