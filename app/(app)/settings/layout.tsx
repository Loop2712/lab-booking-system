import AppShell from "@/components/app-shell/AppShell";
import { adminNav, studentNav, teacherNav } from "@/components/app-shell/nav";
import { requireRole } from "@/lib/auth/guard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export const runtime = "nodejs";

export default async function ตั้งค่าLayout({ children }: { children: React.ReactNode }) {
  // ต้องล็อกอินก่อน (ทุก role ใช้ได้)
  const session = await requireRole(["ADMIN", "TEACHER", "STUDENT"]);
  const role = (session as any)?.role as "ADMIN" | "TEACHER" | "STUDENT" | undefined;

  // เลือกเมนูตาม role เพื่อให้ Sidebar/Topbar ตรงกับผู้ใช้
  const nav =
    role === "ADMIN" ? adminNav :
    role === "STUDENT" ? studentNav :
    teacherNav;

  return (
    <AppShell nav={nav} headerTitle="ตั้งค่า">
      {children}
    </AppShell>
  );
}
