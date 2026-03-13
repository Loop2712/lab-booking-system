"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type KioskToken = {
  id: string;
  token: string;
  isActive: boolean;
  pairedAt: string;
  createdAt: string;
  revokedAt: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function formatDateTime(value: string | Date) {
  try {
    const dt = typeof value === "string" ? new Date(value) : value;
    return dateTimeFormatter.format(dt);
  } catch {
    return String(value);
  }
}

function getStatus(token: KioskToken) {
  if (token.revokedAt) return "REVOKED" as const;
  return token.isActive ? "ACTIVE" : "READY" as const;
}

function getStatusLabel(status: ReturnType<typeof getStatus>) {
  if (status === "ACTIVE") return "ใช้งานอยู่";
  if (status === "READY") return "พร้อมจับคู่";
  return "ยกเลิกแล้ว";
}

function getStatusVariant(status: ReturnType<typeof getStatus>) {
  if (status === "ACTIVE") return "default" as const;
  if (status === "READY") return "secondary" as const;
  return "destructive" as const;
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
        setError(json?.message || "โหลดรายการอุปกรณ์ Kiosk ไม่สำเร็จ");
        return;
      }

      setItems(Array.isArray(json.tokens) ? json.tokens : []);
    } catch (e: any) {
      setError(e?.message || "ERROR");
    } finally {
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
        return;
      }

      const token = json.token as KioskToken;
      setItems((prev) => prev.map((item) => (item.id === token.id ? token : item)));
    } catch (e: any) {
      setError(e?.message || "ERROR");
    } finally {
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
        return;
      }

      const token = json.token as KioskToken;
      setLatestToken(token);
      setItems((prev) => [token, ...prev]);
    } catch (e: any) {
      setError(e?.message || "ERROR");
    } finally {
      setCreating(false);
    }
  }

  const metrics = useMemo(() => {
    const active = items.filter((item) => item.isActive && !item.revokedAt).length;
    const ready = items.filter((item) => !item.isActive && !item.revokedAt).length;
    const revoked = items.filter((item) => Boolean(item.revokedAt)).length;
    return { active, ready, revoked };
  }, [items]);

  useEffect(() => {
    void loadTokens();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">อุปกรณ์ Kiosk</h1>
          <p className="text-sm text-muted-foreground">
            จัดการ token สำหรับหน้า <span className="font-mono">/self-check</span> และตรวจสถานะอุปกรณ์ที่ถูกจับคู่แล้ว
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/kiosk/pair">ไปหน้าจับคู่เครื่อง</Link>
          </Button>
          <Button variant="outline" onClick={() => void loadTokens()} disabled={loading}>
            รีเฟรช
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>กำลังใช้งาน</CardDescription>
            <CardTitle className="text-3xl">{metrics.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>พร้อมจับคู่</CardDescription>
            <CardTitle className="text-3xl">{metrics.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>ถูกยกเลิก</CardDescription>
            <CardTitle className="text-3xl">{metrics.revoked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ขั้นตอนเชื่อมต่ออุปกรณ์</CardTitle>
          <CardDescription>เพื่อให้เครื่อง Kiosk ใช้งานได้แน่นอน ควรทำตามลำดับนี้ทุกครั้ง</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-dashed p-4 text-sm">
            <div className="font-semibold">1. สร้าง Token</div>
            <div className="mt-2 text-muted-foreground">กดสร้าง token ใหม่สำหรับเครื่องที่จะตั้งเป็น Kiosk</div>
          </div>
          <div className="rounded-xl border border-dashed p-4 text-sm">
            <div className="font-semibold">2. เปิดหน้า Pair บนเครื่องจริง</div>
            <div className="mt-2 text-muted-foreground">ล็อกอินแอดมินบนเครื่องนั้น แล้วกรอก token ที่สร้างไว้</div>
          </div>
          <div className="rounded-xl border border-dashed p-4 text-sm">
            <div className="font-semibold">3. ตรวจสถานะว่าจับคู่แล้ว</div>
            <div className="mt-2 text-muted-foreground">
              เมื่อ pair สำเร็จ เครื่องจะเปิดหน้า <span className="font-mono">/self-check</span> ได้ทันที
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">สร้าง Kiosk Token</CardTitle>
          <CardDescription>ใช้สร้าง token ใหม่สำหรับอุปกรณ์ที่ยังไม่ถูกผูกกับเครื่องใด</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void createToken()} disabled={creating}>
              {creating ? "กำลังสร้าง..." : "สร้าง Kiosk Token"}
            </Button>
          </div>

          {latestToken ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-sm font-semibold text-emerald-950">Token ล่าสุด</div>
              <div className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-emerald-950">
                {latestToken.token}
              </div>
              <div className="mt-2 text-xs text-emerald-900">สร้างเมื่อ {formatDateTime(latestToken.createdAt)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(latestToken.token)}
                >
                  คัดลอก Token
                </Button>
                <Button size="sm" asChild>
                  <Link href="/kiosk/pair">เปิดหน้าจับคู่</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการอุปกรณ์และ Token</CardTitle>
          <CardDescription>ตรวจสอบว่า token ใดถูกใช้งานแล้ว พร้อมยกเลิกอุปกรณ์ที่ไม่ต้องการ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">กำลังโหลดรายการอุปกรณ์...</div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              ยังไม่มี token ในระบบ
            </div>
          ) : (
            items.map((item) => {
              const status = getStatus(item);
              return (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          สร้างเมื่อ {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <div className="break-all font-mono text-sm">{item.token}</div>
                      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                        <div>
                          {item.isActive ? `จับคู่ล่าสุด ${formatDateTime(item.pairedAt)}` : "ยังไม่ถูกจับคู่"}
                        </div>
                        <div>
                          {item.revokedAt ? `ยกเลิกเมื่อ ${formatDateTime(item.revokedAt)}` : "ยังไม่ถูกยกเลิก"}
                        </div>
                      </div>
                    </div>

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
                        onClick={() => void revokeToken(item.id)}
                      >
                        {revokingId === item.id ? "กำลังยกเลิก..." : "ยกเลิกอุปกรณ์"}
                      </Button>
                    </div>
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
