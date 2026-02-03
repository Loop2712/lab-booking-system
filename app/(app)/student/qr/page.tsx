"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const REFRESH_MS = 3 * 60 * 1000;

export default function StudentQrPage() {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/qr/me", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError("โหลด QR token ไม่สำเร็จ");
      return;
    }
    setToken(json.token);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function copy() {
    await navigator.clipboard.writeText(token);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">QR Token ของฉัน</h1>
      <p className="text-sm text-muted-foreground">
        ใช้แสดงให้เจ้าหน้าที่สแกน/คัดลอก เพื่อระบุว่า “ใครเป็นคนยืม/คืนกุญแจ”
      </p>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-xs text-muted-foreground">TOKEN</div>
        <div className="font-mono text-sm break-all">{token || "กำลังโหลด..."}</div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>รีเฟรช</Button>
          <Button onClick={copy} disabled={!token}>คัดลอก</Button>
        </div>
      </div>
    </div>
  );
}
