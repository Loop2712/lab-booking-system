"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="mt-0.5" size={18} />
      <div className="leading-relaxed">{msg}</div>
    </div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
      <CheckCircle2 className="mt-0.5" size={18} />
      <div className="leading-relaxed">{msg}</div>
    </div>
  );
}

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "INVALID_CURRENT_PASSWORD"
          ? "รหัสผ่านเดิมไม่ถูกต้อง"
          : json?.message === "NEW_PASSWORD_SAME_AS_OLD"
          ? "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"
          : json?.message === "VALIDATION_ERROR"
          ? "กรุณากรอกข้อมูลให้ถูกต้อง (รหัสผ่านอย่างน้อย 8 ตัว และยืนยันให้ตรงกัน)"
          : "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่";

      setError(msg);
      return;
    }

    setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword(""); 
    setTimeout(() => {
        signOut({ callbackUrl: "/" });
    }, 1500);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Code</Label>
        <div className="relative">
          <Input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type={showCurrent ? "text" : "password"}
            placeholder="รหัสเดิม"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showCurrent ? "ซ่อนรหัสผ่านเดิม" : "แสดงรหัสผ่านเดิม"}
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Code</Label>
        <div className="relative">
          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type={showNew ? "text" : "password"}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showNew ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"}
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>ConfirmCode</Label>
        <div className="relative">
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type={showConfirm ? "text" : "password"}
            placeholder="พิมพ์ซ้ำให้ตรงกัน"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? "ซ่อนยืนยันรหัสผ่าน" : "แสดงยืนยันรหัสผ่าน"}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && <ErrorBox msg={error} />}
      {success && <SuccessBox msg={success} />}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}
