import AppShell from "@/components/app-shell/AppShell";
import { adminNav } from "@/components/app-shell/nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={adminNav} headerTitle="Admin Dashboard">{children}</AppShell>;
}
