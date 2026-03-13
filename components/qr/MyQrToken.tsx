"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, ShieldCheck, QrCode } from "lucide-react";

const REFRESH_MS = 2 * 60 * 1000;
const QR_SIZE = 280;

function makeQrUrl(token: string, size = QR_SIZE) {
  const data = encodeURIComponent(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

type MyQrTokenProps = {
  checkOnly?: boolean;
};

type QrPayload = {
  token: string;
  expiresAt?: string | null;
  expiresInSeconds?: number | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default function MyQrToken({ checkOnly = false }: MyQrTokenProps) {
  const [qr, setQr] = useState<QrPayload>({ token: "", expiresAt: null, expiresInSeconds: null });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const size = checkOnly ? 320 : 240;
  const qrUrl = useMemo(() => (qr.token ? makeQrUrl(qr.token, size) : ""), [qr.token, size]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/qr/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      if (json?.message === "QR_CONFIG_ERROR") {
        setError("ระบบ QR ยังไม่ถูกตั้งค่า กรุณาติดต่อผู้ดูแลระบบ");
      } else {
        setError("โหลด QR token ไม่สำเร็จ");
      }
      setQr({ token: "", expiresAt: null, expiresInSeconds: null });
      return;
    }

    setQr({
      token: String(json.token || ""),
      expiresAt: typeof json.expiresAt === "string" ? json.expiresAt : null,
      expiresInSeconds: typeof json.expiresInSeconds === "number" ? json.expiresInSeconds : null,
    });
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(qr.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load();

    const timer = setInterval(() => {
      void load();
    }, REFRESH_MS);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  if (checkOnly) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <div className="flex justify-center">
          <div className="relative rounded-3xl bg-white p-5 pb-8 shadow-lg ring-1 ring-black/5">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR Code สำหรับยืม-คืนกุญแจ"
                className="h-[320px] w-[320px] rounded-2xl"
              />
            ) : (
              <div className="flex h-[320px] w-[320px] items-center justify-center rounded-2xl bg-muted/50 text-sm text-muted-foreground">
                กำลังโหลด QR...
              </div>
            )}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow">
              แสดงให้จุดยืม-คืนสแกนหรืออัปโหลดภาพได้
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-stone-50 px-4 py-3 text-center text-xs text-stone-600">
          QR จะรีเฟรชอัตโนมัติเมื่อกลับมาที่หน้านี้ และหมดอายุประมาณ{" "}
          {qr.expiresInSeconds ? `${Math.round(qr.expiresInSeconds / 60)} นาที` : "ไม่กี่นาที"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">QR Code สำหรับยืม-คืนกุญแจ</span>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-black/5">
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrUrl} alt="QR Token" className="h-[240px] w-[240px] rounded-xl" />
              ) : (
                <div className="flex h-[240px] w-[240px] items-center justify-center rounded-xl bg-muted/50 text-sm text-muted-foreground">
                  กำลังโหลด...
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-2xl border bg-stone-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                <ShieldCheck className="size-4" />
                ใช้ยืนยันตัวตนหน้างาน
              </div>
              <div className="mt-2 text-xs leading-5 text-stone-600">
                QR นี้จะรีเฟรชอัตโนมัติทุกไม่กี่นาที และจะโหลดใหม่ทันทีเมื่อกลับมาที่หน้านี้
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Token (สำรอง)</p>
              <p className="break-all rounded-lg bg-muted/50 px-3 py-2.5 font-mono text-sm text-foreground/90">
                {qr.token || "—"}
              </p>
            </div>

            <div className="grid gap-2 rounded-2xl border bg-white p-4 text-xs text-stone-600 sm:grid-cols-2">
              <div>
                <div className="font-medium text-stone-900">หมดอายุประมาณ</div>
                <div className="mt-1">{formatDateTime(qr.expiresAt)}</div>
              </div>
              <div>
                <div className="font-medium text-stone-900">อายุ token</div>
                <div className="mt-1">
                  {qr.expiresInSeconds ? `${Math.round(qr.expiresInSeconds / 60)} นาที` : "-"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                รีเฟรช
              </Button>
              <Button size="sm" onClick={copy} disabled={!qr.token} className="gap-2">
                <Copy className="h-4 w-4" />
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              หากจุดยืม-คืนยังไม่มีเครื่องสแกน สามารถใช้ภาพ QR นี้แล้วอัปโหลดเข้าหน้ายืม-คืนได้โดยตรง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
