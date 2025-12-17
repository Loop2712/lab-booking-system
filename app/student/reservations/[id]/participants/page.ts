"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type P = { id: string; userId: string; name: string; studentId: string | null };

export default function ParticipantsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [studentId, setStudentId] = useState("");
  const [items, setItems] = useState<P[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => 1 + items.length, [items.length]); // + requester

  async function load() {
    setError(null);
    const res = await fetch(`/api/reservations/${id}/participants`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message ? `โหลดไม่สำเร็จ: ${json.message}` : "โหลดไม่สำเร็จ");
      return;
    }
    setItems(json.participants ?? []);
  }

  useEffect(() => { load(); }, [id]);

  async function add() {
    setError(null);
    if (studentId.trim().length !== 11) {
      setError("กรุณากรอกรหัสนักศึกษา 11 หลัก");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentId.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.message || `เพิ่มไม่สำเร็จ (${res.status})`;
      setError(msg === "LIMIT_EXCEEDED" ? "เพิ่มไม่ได้: จำกัดรวมสูงสุด 5 คน (รวมผู้จอง)" : msg);
      return;
    }

    setStudentId("");
    await load();
  }

  async function remove(participantId: string) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/participants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || `ลบไม่สำเร็จ (${res.status})`);
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ผู้ร่วมในการยืม (Ad-hoc)</h1>
        <p className="text-sm text-muted-foreground">
          ผู้ที่อยู่ในรายการนี้สามารถนำ QR token มายืม/คืนกุญแจแทนได้ (รวมผู้จองสูงสุด 5 คน)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">รวมตอนนี้: {total}/5</Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">เพิ่มผู้ร่วมด้วยรหัสนักศึกษา</div>
        <div className="flex gap-2">
          <Input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="65000000001"
            inputMode="numeric"
          />
          <Button onClick={add} disabled={busy}>
            {busy ? "กำลังเพิ่ม..." : "เพิ่ม"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          จำกัด participants ได้สูงสุด 4 คน (เพราะผู้จองนับเป็น 1 คน รวม = 5)
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>รหัสนักศึกษา</TableHead>
              <TableHead className="text-right">การทำงาน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  ยังไม่มีผู้ร่วม
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-sm">{p.studentId ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => remove(p.id)} disabled={busy}>
                      ลบ
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
