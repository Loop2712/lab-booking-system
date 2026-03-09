"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, QrCode } from "lucide-react";

const REFRESH_MS = 3 * 60 * 1000;

const QR_SIZE = 280;

function makeQrUrl(token: string, size = QR_SIZE) {
  const data = encodeURIComponent(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}`;
}

type MyQrTokenProps = {
  /** โหมดแสดงเฉพาะ QR สำหรับหน้าเช็คอิน (ไม่แสดง token text / ปุ่ม) */
  checkOnly?: boolean;
};

export default function MyQrToken({ checkOnly = false }: MyQrTokenProps) {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const size = checkOnly ? 320 : 240;
  const qrUrl = useMemo(() => (token ? makeQrUrl(token, size) : ""), [token, size]);

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
      setToken("");
      return;
    }
    setToken(String(json.token || ""));
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (checkOnly) {
    return (
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">
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
              <div className="h-[320px] w-[320px] rounded-2xl bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                กำลังโหลด QR...
              </div>
            )}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow">
              สแกนที่จุดยืม-คืนกุญแจ
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
        <div className="bg-muted/40 px-5 py-3 flex items-center gap-2 border-b">
          <QrCode className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">QR Code สำหรับยืม-คืนกุญแจ</span>
        </div>

        <div className="p-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="shrink-0 mx-auto sm:mx-0">
            <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-black/5">
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR Token"
                  className="h-[240px] w-[240px] rounded-xl"
                />
              ) : (
                <div className="h-[240px] w-[240px] rounded-xl bg-muted/50 flex items-center justify-center text-sm text-muted-foreground">
                  กำลังโหลด...
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Token (สำรอง)</p>
              <p className="font-mono text-sm break-all rounded-lg bg-muted/50 px-3 py-2.5 text-foreground/90">
                {token || "—"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={load} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                รีเฟรช
              </Button>
              <Button size="sm" onClick={copy} disabled={!token} className="gap-2">
                <Copy className="h-4 w-4" />
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              แนะนำให้แสดง QR ให้เจ้าหน้าที่สแกน จะเร็วกว่าและลดการพิมพ์ผิด
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
