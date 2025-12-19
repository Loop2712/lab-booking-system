import AppShell from "@/components/app-shell/AppShell";
import { teacherNav } from "@/components/app-shell/nav";
import { requireRole } from "@/lib/auth/guard";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["TEACHER", "ADMIN"]);
  return <AppShell nav={teacherNav} headerTitle="แดชบอร์ดอาจารย์">{children}</AppShell>;
}