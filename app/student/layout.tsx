import AppShell from "@/components/app-shell/AppShell";
import { studentNav } from "@/components/app-shell/nav";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={studentNav} headerTitle="Student Dashboard">{children}</AppShell>;
}
