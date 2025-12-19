"use client";

import { useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginType = "STUDENT" | "STAFF";
type Role = "ADMIN" | "TEACHER" | "STUDENT";

function roleToDashboard(role: Role | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  if (role === "STUDENT") return "/student";
  return "/";
}

function normalizeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) return null;
  if (callbackUrl === "/login" || callbackUrl.startsWith("/api/auth")) return null;

  try {
    if (callbackUrl.startsWith("http")) {
      const u = new URL(callbackUrl);
      return u.pathname + (u.search ?? "");
    }
  } catch {
    // ignore
  }

  if (!callbackUrl.startsWith("/")) return null;
  return callbackUrl;
}

function isCallbackAllowedForRole(path: string, role: Role | undefined) {
  if (!role) return false;

  if (path.startsWith("/admin")) return role === "ADMIN";
  if (path.startsWith("/teacher")) return role === "TEACHER";
  if (path.startsWith("/student")) return role === "STUDENT";
  return true; // หน้าทั่วไปอนุญาตทุก role
}

function humanizeSignInError(code: string | undefined | null) {
  if (!code) return null;

  if (code === "RATE_LIMITED") {
    return "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
  }
  if (code === "CredentialsSignin") {
    return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }

  // เผื่อ NextAuth ส่ง error อื่นมา
  return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่";
}

export default function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError: string | null;
}) {
  const { update } = useSession();

  const [loginType, setLoginType] = useState<LoginType>("STUDENT");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // YYYYMMDD
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    humanizeSignInError(initialError)
  );

  const isStudent = loginType === "STUDENT";

  const canSubmit = useMemo(() => {
    if (!password.match(/^\d{8}$/)) return false;
    if (isStudent) return studentId.trim().length === 11;
    return email.trim().length > 3;
  }, [password, isStudent, studentId, email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      callbackUrl,
      loginType,
      birthDate: password, // YYYYMMDD
      studentId: isStudent ? studentId.trim() : undefined,
      email: !isStudent ? email.trim() : undefined,
    });

    setLoading(false);

    if (!res?.ok) {
      setError(humanizeSignInError(res?.error) ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    // refresh session เพื่อให้ role ล่าสุดมาแน่ ๆ
    const newSession = await update();
    const role = (newSession as any)?.role as Role | undefined;

    const normalized = normalizeCallbackUrl(callbackUrl);
    const target =
      normalized && isCallbackAllowedForRole(normalized, role)
        ? normalized
        : roleToDashboard(role);

    window.location.href = target;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>ประเภทผู้ใช้</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={loginType === "STUDENT" ? "default" : "outline"}
            onClick={() => setLoginType("STUDENT")}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={loginType === "STAFF" ? "default" : "outline"}
            onClick={() => setLoginType("STAFF")}
          >
            Staff
          </Button>
        </div>
      </div>

      {isStudent ? (
        <div className="space-y-2">
          <Label>รหัสนักศึกษา (11 หลัก)</Label>
          <Input
            value={studentId}
            onChange={(e) =>
              setStudentId(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            inputMode="numeric"
            placeholder="65000000001"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>อีเมล</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@lab.local"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>รหัสผ่าน (YYYYMMDD)</Label>
        <div className="relative">
          <Input
            value={password}
            onChange={(e) =>
              setPassword(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            inputMode="numeric"
            maxLength={8}
            type={showPassword ? "text" : "password"}
            placeholder="20040220"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">ตัวอย่าง 20040220</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5" size={18} />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
