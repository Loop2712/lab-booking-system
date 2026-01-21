"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

function makeQrUrl(token: string) {
  // ใช้บริการสร้าง QR ภายนอก (ง่ายสุด ไม่ต้องลง lib เพิ่ม)
  // ถ้าอยาก self-host ทีหลัง ค่อยเปลี่ยนเป็น generator ฝั่งเราได้
  const data = encodeURIComponent(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${data}`;
}

export default function MyQrToken() {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const qrUrl = useMemo(() => (token ? makeQrUrl(token) : ""), [token]);

  async function load({ initial }: { initial?: boolean } = {}) {
    if (!initial) {
      setError(null);
    }
    const res = await fetch("/api/qr/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError("โหลด QR token ไม่สำเร็จ");
      setToken("");
      return;
    }
    setError(null);
    setToken(String(json.token || ""));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load({ initial: true });
  }, []);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="text-xs text-muted-foreground">
          QR TOKEN (ให้เจ้าหน้าที่สแกนที่จุดยืมกุญแจ)
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR Token"
                className="h-[220px] w-[220px] rounded-xl border bg-white"
              />
            ) : (
              <div className="h-[220px] w-[220px] rounded-xl border flex items-center justify-center text-sm text-muted-foreground">
                กำลังโหลด...
              </div>
            )}
          </div>

          <div className="space-y-3 min-w-0">
            <div className="text-xs text-muted-foreground">TOKEN (สำรอง)</div>
            <div className="font-mono text-sm break-all">{token || "กำลังโหลด..."}</div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>
                รีเฟรช
              </Button>
              <Button onClick={copy} disabled={!token}>
                คัดลอก
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              * แนะนำให้แสดงเป็น QR เพื่อสแกนเร็ว และลดพิมพ์ผิด
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
