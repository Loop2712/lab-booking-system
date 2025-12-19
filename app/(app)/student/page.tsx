import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.uid as string;

  const groups = await prisma.reservation.groupBy({
    by: ["status"],
    where: { requesterId: uid },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const pending = counts.PENDING ?? 0;
  const approved = counts.APPROVED ?? 0;
  const checkedIn = counts.CHECKED_IN ?? 0;
  const completed = counts.COMPLETED ?? 0;
  const rejected = counts.REJECTED ?? 0;
  const cancelled = counts.CANCELLED ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">แดชบอร์ดนักศึกษา</h1>
        <p className="text-sm text-muted-foreground">สรุปรายการจองของคุณ และทางลัดที่ใช้บ่อย</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{total}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">รออนุมัติ</CardTitle>
            <Badge variant="secondary">PENDING</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pending}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">อนุมัติแล้ว</CardTitle>
            <Badge variant="secondary">APPROVED</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{approved}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">กำลังยืม</CardTitle>
            <Badge variant="secondary">CHECKED_IN</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{checkedIn}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">เสร็จสิ้น</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{completed}</div>
            <Badge variant="outline">COMPLETED</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ถูกปฏิเสธ / ยกเลิก</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{rejected + cancelled}</div>
            <div className="flex gap-2">
              <Badge variant="outline">REJECTED</Badge>
              <Badge variant="outline">CANCELLED</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/student/reserve">จองห้อง</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/student/reservations">รายการจองของฉัน</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/student/qr">QR Token ของฉัน</Link>
        </Button>
      </div>
    </div>
  );
}
