import Link from "next/link";
import { Button } from "@/components/ui/button";
import AdminMetricCards from "./_components/admin-metric-cards";
import AdminRoomsStatusTable from "./_components/admin-rooms-status-table";
import { getAdminDashboardMetrics } from "./_data/dashboard-metrics";
import {
  DoorOpen,
  Key,
  ClipboardList,
  KeyRound,
  Settings,
  FileText,
  Calendar,
  Users,
} from "lucide-react";

export default async function AdminDashboard() {
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">แดชบอร์ดแอดมิน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ภาพรวมคำขอจอง การยืม-คืนกุญแจ ห้อง และกุญแจ
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/teacher/requests"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ClipboardList className="h-4 w-4" />
            คำขอจอง
          </Link>
          <Link
            href="/admin/check"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <KeyRound className="h-4 w-4" />
            ยืม-คืนกุญแจ
          </Link>
          <Link
            href="/admin/reservations"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <FileText className="h-4 w-4" />
            รายการจอง
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">สถิติหลัก</h2>
        <AdminMetricCards metrics={metrics} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">สถานะห้องวันนี้</h2>
        <AdminRoomsStatusTable />
      </div>

      <div className="rounded-2xl border bg-muted/30 p-6 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-foreground mb-4">จัดการระบบ</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" size="lg" className="h-auto justify-start gap-2 py-4">
            <Link href="/admin/rooms" className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 shrink-0" />
              จัดการห้อง
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-auto justify-start gap-2 py-4">
            <Link href="/admin/keys" className="flex items-center gap-2">
              <Key className="h-5 w-5 shrink-0" />
              จัดการกุญแจ
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-auto justify-start gap-2 py-4">
            <Link href="/admin/sections" className="flex items-center gap-2">
              <Calendar className="h-5 w-5 shrink-0" />
              ตารางเรียน
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-auto justify-start gap-2 py-4">
            <Link href="/admin/users" className="flex items-center gap-2">
              <Users className="h-5 w-5 shrink-0" />
              ผู้ใช้
            </Link>
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Link href="/admin/reports">
              <FileText className="h-4 w-4" />
              รายงาน
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Link href="/admin/term-setup">
              <Settings className="h-4 w-4" />
              ภาคเรียน
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
