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
  return true;
}

function humanizeSignInError(code: string | undefined | null) {
  if (!code) return null;

  if (code === "RATE_LIMITED") {
    return "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
  }
  if (code === "CredentialsSignin") {
    return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }

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

  // ✅ ให้ทั้ง student/staff กรอกรหัสผ่านเอง
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    humanizeSignInError(initialError)
  );

  const isStudent = loginType === "STUDENT";

  const canSubmit = useMemo(() => {
    if (isStudent) {
      const idOk = studentId.trim().length === 11;
      const passOk = password.trim().length === 11;
      // ✅ policy: password ของ student คือรหัสนักศึกษา
      const match = studentId.trim() === password.trim();
      return idOk && passOk && match;
    }

    const emailOk = email.trim().length > 3;
    const passOk = password.match(/^\d{8}$/); // YYYYMMDD
    return emailOk && !!passOk;
  }, [isStudent, studentId, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      callbackUrl,
      loginType,
      // ✅ ใช้ชื่อ field เป็น password (ฝั่ง server จะอ่านจาก credentials.password)
      password: password.trim(),
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

  const studentMismatch =
    isStudent &&
    studentId.trim().length > 0 &&
    password.trim().length > 0 &&
    studentId.trim() !== password.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Login as</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={loginType === "STUDENT" ? "default" : "outline"}
            onClick={() => {
              setLoginType("STUDENT");
              setPassword("");
              setError(null);
            }}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={loginType === "STAFF" ? "default" : "outline"}
            onClick={() => {
              setLoginType("STAFF");
              setPassword("");
              setError(null);
            }}
          >
            Staff (Teacher/Admin)
          </Button>
        </div>
      </div>

      {isStudent ? (
        <>
          <div className="space-y-2">
            <Label>Student ID (11 digits)</Label>
            <Input
              value={studentId}
              onChange={(e) =>
                setStudentId(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              inputMode="numeric"
              placeholder="65000000001"
            />
          </div>

          <div className="space-y-2">
            <Label>Password (Student ID)</Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                inputMode="numeric"
                maxLength={11}
                type={showPassword ? "text" : "password"}
                placeholder="กรอกรหัสนักศึกษาอีกครั้ง"
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

            {studentMismatch ? (
              <p className="text-xs text-destructive">
                รหัสผ่านไม่ตรงกับรหัสนักศึกษา กรุณาตรวจสอบอีกครั้ง
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                สำหรับนักศึกษา: รหัสผ่านคือ “รหัสนักศึกษา” (กรอกเพื่อยืนยัน)
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@lab.local"
            />
          </div>

          <div className="space-y-2">
            <Label>Password (YYYYMMDD)</Label>
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
            <p className="text-xs text-muted-foreground">
              สำหรับบุคลากร: ใช้วันเกิดรูปแบบ YYYYMMDD เป็นรหัสผ่านเริ่มต้น
            </p>
          </div>
        </>
      )}

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
