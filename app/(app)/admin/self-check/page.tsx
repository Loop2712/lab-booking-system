"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type KioskToken = {
  id: string;
  token: string;
  isActive: boolean;
  pairedAt: string;
  createdAt: string;
  revokedAt: string | null;
};

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
  return token.isActive ? "ACTIVE" : "UNPAIRED";
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
        setError(json?.message || "โหลดรายการ Kiosk Device ไม่สำเร็จ");
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

  async function revokeToken(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kiosk-tokens/${id}`, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message || "ยกเลิกอุปกรณ์ไม่สำเร็จ");
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

  const activeCount = useMemo(() => items.filter((t) => t.isActive && !t.revokedAt).length, [items]);

  useEffect(() => {
    loadTokens();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Kiosk Device</h1>
        <p className="text-sm text-muted-foreground">
          จัดการอุปกรณ์ที่จับคู่สำหรับหน้า /self-check
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-[#6ABE75] text-white hover:bg-[#5AAE67]">
            <Link href="/kiosk/pair">ไปหน้าจับคู่เครื่อง</Link>
          </Button>
          <Button variant="outline" onClick={loadTokens} disabled={loading}>
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">สร้าง Kiosk Token สำหรับจับคู่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={createToken} disabled={creating}>
              {creating ? "กำลังสร้าง..." : "สร้าง Kiosk Token"}
            </Button>
          </div>
          {latestToken ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm">
              <div className="font-medium text-emerald-900">Token ที่สร้างล่าสุด</div>
              <div className="mt-1 font-mono break-all text-emerald-900">{latestToken.token}</div>
              <div className="mt-1 text-xs text-emerald-800">
                สร้างเมื่อ: {formatDateTime(latestToken.createdAt)}
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
          <CardTitle className="text-base">รายการอุปกรณ์</CardTitle>
          <div className="text-sm text-muted-foreground">Active: {activeCount}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ที่จับคู่</div>
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
                  {item.isActive ? (
                    <div className="text-xs text-muted-foreground">
                      จับคู่เมื่อ: {formatDateTime(item.pairedAt)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">ยังไม่ถูกจับคู่</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    สร้างเมื่อ: {formatDateTime(item.createdAt)}
                  </div>
                  {item.revokedAt ? (
                    <div className="text-xs text-muted-foreground">
                      ถูกยกเลิกเมื่อ: {formatDateTime(item.revokedAt)}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(item.token)}
                    >
                      คัดลอก Token
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!item.isActive || !!item.revokedAt || revokingId === item.id}
                      onClick={() => revokeToken(item.id)}
                    >
                      {revokingId === item.id ? "กำลังยกเลิก..." : "ยกเลิกอุปกรณ์"}
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
