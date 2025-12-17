"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Mode = "pickup" | "return";

export default function KioskPage() {
  const sp = useSearchParams();
  const initialMode = (sp.get("mode") as Mode) || "pickup";
  const initialToken = sp.get("token") || "";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [token, setToken] = useState(initialToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // pickup response
  const [returnToken, setReturnToken] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setToken(initialToken);
  }, [initialMode, initialToken]);

  async function submit() {
    setError(null);
    setSuccess(null);
    setReturnToken(null);

    if (!token.trim()) {
      setError("กรุณากรอก token หรือสแกน QR");
      return;
    }

    setLoading(true);

    const endpoint = mode === "pickup" ? "/api/public/pickup" : "/api/public/return";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "NO_AVAILABLE_KEY"
          ? "ไม่มีกุญแจว่างสำหรับห้องนี้ (อาจมีคนยืมอยู่)"
          : json?.message
          ? `ทำรายการไม่สำเร็จ: ${json.message}`
          : `ทำรายการไม่สำเร็จ (${res.status})`;
      setError(msg);
      return;
    }

    if (mode === "pickup") {
      setSuccess("รับกุญแจสำเร็จ ✅ กรุณาเก็บ QR/Token สำหรับคืนกุญแจ");
      setReturnToken(json.returnToken ?? null);
    } else {
      setSuccess("คืนกุญแจสำเร็จ ✅ ขอบคุณครับ");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border bg-background p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Kiosk • รับ/คืนกุญแจ</h1>
          <p className="text-sm text-muted-foreground">
            สแกน QR หรือวาง token เพื่อทำรายการ
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={mode === "pickup" ? "default" : "outline"}
            onClick={() => setMode("pickup")}
          >
            รับกุญแจ
          </Button>
          <Button
            variant={mode === "return" ? "default" : "outline"}
            onClick={() => setMode("return")}
          >
            คืนกุญแจ
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Token</Label>
          <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="วาง token ที่ได้จาก QR" />
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>

            {returnToken && (
              <div className="rounded-lg border bg-background p-3">
                <div className="text-xs text-muted-foreground mb-1">RETURN TOKEN (ใช้ตอนคืนกุญแจ)</div>
                <div className="font-mono text-sm break-all">{returnToken}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  ลิงก์คืน: /kiosk?mode=return&token=...
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={submit} disabled={loading}>
          {loading ? "กำลังทำรายการ..." : mode === "pickup" ? "ยืนยันรับกุญแจ" : "ยืนยันคืนกุญแจ"}
        </Button>
      </div>
    </main>
  );
}
