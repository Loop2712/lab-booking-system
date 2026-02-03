import Link from "next/link";
import { Button } from "@/components/ui/button";
import AdminMetricCards from "./_components/admin-metric-cards";
import AdminRoomsStatusTable from "./_components/admin-rooms-status-table";
import { getAdminDashboardMetrics } from "./_data/dashboard-metrics";

export default async function AdminDashboard() {
  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">แดชบอร์ดแอดมิน</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto">
          <Link href="/teacher/requests" className="hover:text-foreground transition">
            ภาพรวมคำขอจอง
          </Link>
          <span>•</span>
          <Link href="/admin/check" className="hover:text-foreground transition">
            การยืม-คืนกุญแจ
          </Link>
          <span>•</span>
          <Link href="/admin/reservations" className="hover:text-foreground transition">
            รายการจองล่าสุด
          </Link>
        </div>
      </div>

      <div className="@container/main flex flex-col gap-6">
        <AdminMetricCards metrics={metrics} />

        <div className="flex flex-col gap-4">
          <AdminRoomsStatusTable />
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
