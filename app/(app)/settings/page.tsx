import ProfileSettings from "./profile-settings";
import { requireRole } from "@/lib/auth/guard";

export default async function ChangePasswordPage() {
  // กันไว้ชั้นนึง (ถึง layout จะ guard แล้วก็ยังปลอดภัย)
  await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground">
          จัดการข้อมูลส่วนตัวและรหัสผ่านของคุณ
        </p>
      </div>

      <ProfileSettings />
    </div>
  );
}
