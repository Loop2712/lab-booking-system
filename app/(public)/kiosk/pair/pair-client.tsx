"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PairClient() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/kiosk/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        if (json?.message === "ALREADY_PAIRED") {
          setError("เครื่องนี้ถูกจับคู่แล้ว");
        } else if (json?.message === "UNAUTHORIZED") {
          setError("ต้องล็อกอินเป็นแอดมินก่อนจึงจะจับคู่ได้");
        } else if (json?.message === "PAIR_CODE_INVALID") {
          setError("รหัส Pair ไม่ถูกต้อง");
        } else if (json?.message === "TOKEN_REVOKED") {
          setError("Token นี้ถูกยกเลิกแล้ว");
        } else if (json?.message === "TOKEN_ALREADY_ACTIVE") {
          setError("Token นี้ถูกใช้งานแล้ว");
        } else if (json?.message === "PAIR_FAILED") {
          setError(`จับคู่ไม่สำเร็จ: ${json?.detail || "ไม่ทราบสาเหตุ"}`);
        } else {
          setError(json?.message || "จับคู่ไม่สำเร็จ");
        }
        setLoading(false);
        return;
      }

      window.location.href = "/self-check";
    } catch (e: any) {
      setError(e?.message || "ERROR");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Pairing Code / Kiosk Token</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ใส่รหัสสำหรับจับคู่"
        />
      </div>
      <Button onClick={onSubmit} disabled={!code.trim() || loading}>
        {loading ? "กำลังจับคู่..." : "จับคู่เครื่องนี้"}
      </Button>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
