import AppShell from "@/components/app-shell/AppShell";
import { adminNav } from "@/components/app-shell/nav";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return <AppShell nav={adminNav} headerTitle="แดชบอร์ดแอดมิน">{children}</AppShell>;
}
