"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ReservationRow = {
  id: string;
  type: string;
  status: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  room: { code: string; name: string; roomNumber: string; floor: number };
  requester: { firstName: string; lastName: string; studentId?: string | null; email?: string | null };
  approver?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  loan?: {
    id: string;
    createdAt: string;
    updatedAt: string;
    borrower?: { firstName: string; lastName: string; studentId?: string | null; email?: string | null } | null;
  } | null;
};

function ymd(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function LoanDesk({ title }: { title: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [pendingCheckin, setPendingCheckin] = useState<ReservationRow[]>([]);
  const [activeLoans, setActiveLoans] = useState<ReservationRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/loans/queue", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError(
        res.status === 401
          ? "ไม่มีสิทธิ์ใช้งาน (ต้องเป็น TEACHER หรือ ADMIN)"
          : "โหลดข้อมูลไม่สำเร็จ"
      );
      return;
    }

    setPendingCheckin(json.pendingCheckin ?? []);
    setActiveLoans(json.activeLoans ?? []);
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

    const res = await fetch("/api/loans/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, userToken: token }),
    });

    const json = await res.json().catch(() => ({}));
    setBusyId(null);

    if (!res.ok || !json?.ok) {
      setError(
        json?.message
          ? `เช็คอินไม่สำเร็จ: ${json.message}`
          : `เช็คอินไม่สำเร็จ (${res.status})`
      );
      return;
    }

    await load();
  }

  async function returnKey(reservationId: string) {
    const token = scanToken.trim();
    if (token.length < 10) {
      setError("กรุณาสแกน/วาง QR Token ก่อน");
      return;
    }

    setBusyId(reservationId);
    setError(null);
    const res = await fetch("/api/loans/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, userToken: token }),
    });

    const json = await res.json().catch(() => ({}));
    setBusyId(null);

    if (!res.ok || !json?.ok) {
      setError(
        json?.message
          ? `คืนกุญแจไม่สำเร็จ: ${json.message}`
          : `คืนกุญแจไม่สำเร็จ (${res.status})`
      );
      return;
    }
    await load();
  }
  const [scanToken, setScanToken] = useState("");


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

      <div className="rounded-2xl border p-4 space-y-2">
        <div className="text-sm font-medium">สแกน/วาง QR Token ของผู้ยืม/ผู้คืน</div>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
          placeholder="วาง token ที่ได้จากหน้า /student/qr"
          value={scanToken}
          onChange={(e) => setScanToken(e.target.value)}
        />
        <div className="text-xs text-muted-foreground">
          ต้องมี token ก่อนถึงจะกด “รับกุญแจ/คืนกุญแจ” ได้
        </div>
      </div>


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
