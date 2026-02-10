"use client";
import type { P } from "./types";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ParticipantsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; firstName: string; lastName: string; studentId?: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<P[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => 1 + items.length, [items.length]); // + requester

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/reservations/${id}/participants`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message ? `โหลดไม่สำเร็จ: ${json.message}` : "โหลดไม่สำเร็จ");
      return;
    }
    setItems(json.participants ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setError("พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา");
      return;
    }
    setSearching(true);
    setError(null);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const json = await res.json().catch(() => ({}));
    setSearching(false);
    if (!res.ok || !json?.ok) {
      setError("ค้นหาไม่สำเร็จ");
      setResults([]);
      return;
    }
    setResults(Array.isArray(json.items) ? json.items : []);
  }

  async function addUser(user: { id: string }) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/reservations/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !json?.ok) {
      const msg = json?.message || `เพิ่มไม่สำเร็จ (${res.status})`;
      const friendly =
        msg === "LIMIT_EXCEEDED"
          ? "เพิ่มไม่ได้: จำกัดรวมสูงสุด 5 คน (รวมผู้จอง)"
          : msg === "ALREADY_ADDED"
          ? "ผู้ใช้นี้ถูกเพิ่มแล้ว"
          : msg === "CANNOT_ADD_SELF"
          ? "ไม่สามารถเพิ่มตัวเองได้"
          : msg === "STUDENT_NOT_FOUND"
          ? "ไม่พบผู้ใช้งานนี้"
          : msg;
      setError(friendly);
      return;
    }

    setQuery("");
    setResults([]);
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
        <h1 className="text-2xl font-semibold">ผู้ร่วมใช้ (AD_HOC)</h1>
        <p className="text-sm text-muted-foreground">
          เพิ่มผู้ร่วมใช้สำหรับการจองนี้ (ผู้ร่วมใช้สามารถสแกน QR/Token ตอนรับ-คืนกุญแจได้)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">ผู้ร่วมใช้: {total}/5</Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm font-medium">ค้นหาและเพิ่มผู้ร่วมใช้</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="พิมพ์รหัสนักศึกษา หรือชื่อ"
          />
          <Button onClick={search} disabled={busy || searching}>
            {searching ? "กำลังค้นหา..." : "ค้นหา"}
          </Button>
        </div>
        {results.length ? (
          <div className="rounded-lg border p-2 space-y-1">
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  {u.firstName} {u.lastName} {u.studentId ? `• ${u.studentId}` : ""}
                </div>
                <Button size="sm" variant="outline" onClick={() => addUser(u)} disabled={busy}>
                  เพิ่ม
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground">
          สามารถเพิ่มผู้ร่วมใช้ได้สูงสุด 4 คน (รวมผู้จองเป็น 5 คน)
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>รหัสนักศึกษา</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  ยังไม่มีผู้ร่วมใช้
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
