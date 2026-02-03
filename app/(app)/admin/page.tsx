import Link from "next/link";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import AdminMetricCards from "./_components/admin-metric-cards";
import { getAdminDashboardMetrics } from "./_data/dashboard-metrics";
import { getAdminDashboardTableRows } from "./_data/dashboard-table";

export default async function AdminDashboard() {
  const [metrics, tableRows] = await Promise.all([
    getAdminDashboardMetrics(),
    getAdminDashboardTableRows(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">แดชบอร์ดแอดมิน</h1>
        <p className="text-sm text-muted-foreground">
          ภาพรวมคำขอจอง การยืม-คืนกุญแจ และรายการจองล่าสุด
        </p>
      </div>

      <div className="@container/main flex flex-col gap-6">
        <AdminMetricCards metrics={metrics} />

        <div className="flex flex-col gap-4">
          <ChartAreaInteractive />
          <DataTable data={tableRows} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/rooms">จัดการห้อง</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/keys">จัดการกุญแจ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/sections">จัดการตารางเรียน</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teacher/requests">ไปหน้าคำขอ (มุมมองอาจารย์)</Link>
        </Button>
      </div>
    </div>
  );
}
