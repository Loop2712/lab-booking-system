"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type KioskToken = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
};

const TOKEN_TTL_HOURS = 15;

function formatDateTime(value: string | Date) {
  try {
    const dt = typeof value === "string" ? new Date(value) : value;
    return dt.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(value);
  }
}

function getStatus(token: KioskToken) {
  if (token.revokedAt) return "REVOKED";
  const exp = new Date(token.expiresAt).getTime();
  if (Number.isNaN(exp)) return "UNKNOWN";
  return exp <= Date.now() ? "EXPIRED" : "ACTIVE";
}

export default function AdminSelfCheckPage() {
  const [items, setItems] = useState<KioskToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestToken, setLatestToken] = useState<KioskToken | null>(null);

  async function loadTokens() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kiosk-tokens", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message || "โหลด Kiosk Token ไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setItems(Array.isArray(json.tokens) ? json.tokens : []);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setLoading(false);
    }
  }

  async function createToken() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kiosk-tokens", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message || "สร้าง Kiosk Token ไม่สำเร็จ");
        setCreating(false);
        return;
      }
      const token = json.token as KioskToken;
      setLatestToken(token);
      setItems((prev) => [token, ...prev]);
      setCreating(false);
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setCreating(false);
    }
  }

  async function revokeToken(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kiosk-tokens/${id}`, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message || "ยกเลิก Token ไม่สำเร็จ");
        setRevokingId(null);
        return;
      }
      const token = json.token as KioskToken;
      setItems((prev) => prev.map((item) => (item.id === token.id ? token : item)));
      setRevokingId(null);
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setRevokingId(null);
    }
  }

  const activeCount = useMemo(() => items.filter((t) => getStatus(t) === "ACTIVE").length, [items]);

  useEffect(() => {
    loadTokens();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kiosk Token</h1>
        <p className="text-sm text-muted-foreground">
          จัดการ Kiosk Token สำหรับหน้า /self-check (อายุ {TOKEN_TTL_HOURS} ชั่วโมง)
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">สร้าง Kiosk Token ใหม่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createToken} disabled={creating}>
              {creating ? "กำลังสร้าง..." : "สร้าง Kiosk Token (15 ชั่วโมง)"}
            </Button>
            <Button variant="outline" onClick={loadTokens} disabled={loading}>
              รีเฟรช
            </Button>
          </div>

          {latestToken ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm">
              <div className="font-medium text-emerald-900">Token ที่สร้างล่าสุด</div>
              <div className="mt-1 font-mono break-all text-emerald-900">{latestToken.token}</div>
              <div className="mt-1 text-xs text-emerald-800">
                หมดอายุ: {formatDateTime(latestToken.expiresAt)}
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(latestToken.token)}
                >
                  คัดลอก Token
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายการ Token</CardTitle>
          <div className="text-sm text-muted-foreground">Active: {activeCount}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">ยังไม่มี Token</div>
          ) : (
            items.map((item) => {
              const status = getStatus(item);
              const statusVariant =
                status === "ACTIVE" ? "default" : status === "REVOKED" ? "destructive" : "secondary";

              return (
                <div key={item.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono break-all text-sm">{item.token}</div>
                    <Badge variant={statusVariant as any}>{status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    สร้างเมื่อ: {formatDateTime(item.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    หมดอายุ: {formatDateTime(item.expiresAt)}
                  </div>
                  {item.createdBy ? (
                    <div className="text-xs text-muted-foreground">
                      สร้างโดย: {item.createdBy.firstName} {item.createdBy.lastName} ({item.createdBy.email ?? "-"})
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(item.token)}
                    >
                      คัดลอก
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={status !== "ACTIVE" || revokingId === item.id}
                      onClick={() => revokeToken(item.id)}
                    >
                      {revokingId === item.id ? "กำลังยกเลิก..." : "ยกเลิก Token"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
