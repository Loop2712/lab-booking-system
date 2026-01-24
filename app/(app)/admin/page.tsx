import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const pendingRequests = await prisma.reservation.count({
    where: { status: "PENDING" },
  });

  const pendingCheckin = await prisma.reservation.count({
    where: { status: "APPROVED", loan: null },
  });

  const activeLoans = await prisma.reservation.count({
    where: { status: "CHECKED_IN" },
  });

  const roomsActive = await prisma.room.count({ where: { isActive: true } });
  const keysAvailable = await prisma.key.count({ where: { status: "AVAILABLE" } });
  const keysBorrowed = await prisma.key.count({ where: { status: "BORROWED" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">แผงควบคุมผู้ดูแลระบบ</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมการจอง + การยืม-คืนกุญแจ</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">คำขอรออนุมัติ</CardTitle>
            <Badge variant="secondary">PENDING</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pendingRequests}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Key</CardTitle>
            <Badge variant="secondary">APPROVED</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pendingCheckin}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Borrow</CardTitle>
            <Badge variant="secondary">CHECKED_IN</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeLoans}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Room</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{roomsActive}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Key</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{keysAvailable}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">KeyBorrow</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{keysBorrowed}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* เผื่ออนาคต: admin master data */}
        <Button asChild variant="outline">
          <Link href="/teacher/requests">ไปหน้าคำขอ (มุมมองอาจารย์)</Link>
        </Button>
      </div>
    </div>
  );
}
