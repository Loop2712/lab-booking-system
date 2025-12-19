import AppShell from "@/components/app-shell/AppShell";
import { studentNav } from "@/components/app-shell/nav";
import { requireRole } from "@/lib/auth/guard";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["STUDENT"]);
  return <AppShell nav={studentNav} headerTitle="แดชบอร์ดนักศึกษา">{children}</AppShell>;
}
