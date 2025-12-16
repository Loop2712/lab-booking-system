import AppShell from "@/components/app-shell/AppShell";
import { teacherNav } from "@/components/app-shell/nav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={teacherNav} headerTitle="Teacher Dashboard">{children}</AppShell>;
}
