"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getKioskPairMessage } from "@/lib/loans/messages";

type PairStatus = {
  paired: boolean;
  token?: string;
  pairedAt?: string;
  createdAt?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function formatDateTime(value?: string) {
  if (!value) return "-";

  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function maskToken(token?: string) {
  if (!token) return "-";
  if (token.length <= 14) return token;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

export default function PairClient() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [status, setStatus] = useState<PairStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadStatus() {
    setStatusLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kiosk/pair", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(getKioskPairMessage(json?.message, json?.detail));
        setStatus(null);
        return;
      }

      setStatus({
        paired: Boolean(json?.paired),
        token: json?.token,
        pairedAt: json?.pairedAt,
        createdAt: json?.createdAt,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "ตรวจสอบสถานะอุปกรณ์ไม่สำเร็จ");
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }

  async function onSubmit() {
    const value = code.trim();
    if (!value) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/kiosk/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(getKioskPairMessage(json?.message, json?.detail));
        return;
      }

      setCode("");
      await loadStatus();
      setSuccess("จับคู่อุปกรณ์สำเร็จแล้ว สามารถเปิดหน้า Kiosk ได้ทันที");
    } catch (e: any) {
      setError(e?.message || "จับคู่อุปกรณ์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-900">สถานะอุปกรณ์นี้</div>
            <div className="text-xs text-stone-600">
              ตรวจสอบจาก cookie และ token ที่ยัง active อยู่ในระบบ
            </div>
          </div>
          <Badge variant={status?.paired ? "default" : "outline"}>
            {statusLoading ? "กำลังตรวจสอบ..." : status?.paired ? "จับคู่แล้ว" : "ยังไม่จับคู่"}
          </Badge>
        </div>

        {status?.paired ? (
          <div className="mt-4 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500">Token</div>
              <div className="font-mono text-sm text-stone-900">{maskToken(status.token)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.2em] text-stone-500">จับคู่ล่าสุด</div>
              <div className="text-sm text-stone-900">{formatDateTime(status.pairedAt)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {status?.paired ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/self-check">เปิดหน้า Kiosk</a>
          </Button>
          <Button variant="outline" onClick={() => void loadStatus()} disabled={statusLoading}>
            ตรวจสอบสถานะอีกครั้ง
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3">
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <div className="font-semibold text-stone-900">1. สร้าง Token</div>
              <div className="mt-1 text-stone-600">สร้างจากหน้าอุปกรณ์ Kiosk ในฝั่งแอดมิน</div>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <div className="font-semibold text-stone-900">2. กรอกรหัส</div>
              <div className="mt-1 text-stone-600">ใช้ Token ที่สร้างไว้ หรือ Pair Code ของระบบ</div>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-sm">
              <div className="font-semibold text-stone-900">3. ยืนยันผล</div>
              <div className="mt-1 text-stone-600">เมื่อสำเร็จ สถานะด้านบนจะเปลี่ยนเป็นจับคู่แล้ว</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pair-code">Pairing Code / Kiosk Token</Label>
            <Input
              id="pair-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ใส่ Pairing Code หรือ Token ที่สร้างไว้"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void onSubmit();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onSubmit()} disabled={!code.trim() || loading}>
              {loading ? "กำลังจับคู่..." : "จับคู่เครื่องนี้"}
            </Button>
            <Button variant="outline" onClick={() => void loadStatus()} disabled={statusLoading}>
              โหลดสถานะใหม่
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
