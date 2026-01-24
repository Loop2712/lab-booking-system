"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { humanizeSignInError } from "./component/messages";
import { redirectAfterLogin } from "./component/redirectAfterLogin";
import { loginStudent } from "./component/loginStudent";
import { loginTeacher } from "./component/loginTeacher";

type LoginMode = "STUDENT" | "STAFF";

export default function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError: string | null;
}) {
  const { update } = useSession();

  const [mode, setMode] = useState<LoginMode>("STUDENT");

  // student
  const [studentId, setStudentId] = useState("");
  // staff
  const [email, setEmail] = useState("");

  // shared password input (student: 11 digits studentId, staff: YYYYMMDD)
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    humanizeSignInError(initialError)
  );

  const isStudent = mode === "STUDENT";

  const canSubmit = useMemo(() => {
    if (isStudent) {
      const idOk = studentId.trim().length === 11;
      const passOk = password.trim().length === 11;
      const match = studentId.trim() === password.trim(); // policy: pass = studentId
      return idOk && passOk && match;
    }

    const emailOk = email.trim().length > 3;
    const passOk = /^\d{8}$/.test(password); // YYYYMMDD
    return emailOk && passOk;
  }, [isStudent, studentId, email, password]);

  const studentMismatch =
    isStudent &&
    studentId.trim().length > 0 &&
    password.trim().length > 0 &&
    studentId.trim() !== password.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = isStudent
        ? await loginStudent({
            callbackUrl,
            studentId: studentId.trim(),
            password: password.trim(),
          })
        : await loginTeacher({
            callbackUrl,
            email: email.trim().toLowerCase(),
            password,
          });

      if (!res?.ok) {
        setError(humanizeSignInError(res?.error) ?? "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(false);
        return;
      }

      // redirect ตาม role หลัง session อัปเดต
      await redirectAfterLogin({
        callbackUrl,
        updateSession: async () => (await update()) as any,
      });
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>ประเภทผู้ใช้</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "STUDENT" ? "default" : "outline"}
            onClick={() => {
              setMode("STUDENT");
              setPassword("");
              setError(null);
            }}
          >
            Student
          </Button>
          <Button
            type="button"
            variant={mode === "STAFF" ? "default" : "outline"}
            onClick={() => {
              setMode("STAFF");
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

          <div className="space-y-2">
            <Label>รหัสผ่าน (รหัสนักศึกษา)</Label>
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
                รหัสผ่านไม่ตรง กรุณาตรวจสอบอีกครั้ง
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                นักศึกษา: รหัสนักศึกษา
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
            <p className="text-xs text-muted-foreground">
              บุคลากร (ครู/แอดมิน): ใช้วันเกิดรูปแบบ YYYYMMDD เป็นรหัสผ่านเริ่มต้น
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
