import PasswordForm from "./password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guard";

export const runtime = "nodejs";

export default async function ChangePasswordPage() {
  // กันไว้ชั้นนึง (ถึง layout จะ guard แล้วก็ยังปลอดภัย)
  await requireRole(["ADMIN", "TEACHER", "STUDENT"]);

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Change password</h1>
        <p className="text-sm text-muted-foreground">
          เปลี่ยนรหัสผ่านสำเร็จแล้วระบบจะพาออกจากระบบ เพื่อให้ล็อกอินใหม่ด้วยรหัสผ่านใหม่
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">เปลี่ยนรหัสผ่าน</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
