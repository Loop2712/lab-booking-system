import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const runtime = "nodejs";

export default async function TeacherDashboard() {
  const pendingRequests = await prisma.reservation.count({
    where: { status: "PENDING" },
  });

  const pendingCheckin = await prisma.reservation.count({
    where: { status: "APPROVED", loan: null },
  });

  const activeLoans = await prisma.reservation.count({
    where: { status: "CHECKED_IN" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">แดชบอร์ดอาจารย์</h1>
        <p className="text-sm text-muted-foreground">สรุปคำขอจอง และงานที่ต้องทำใน โต๊ะยืมคืน</p>
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
            <CardTitle className="text-sm">รอรับกุญแจ</CardTitle>
            <Badge variant="secondary">APPROVED</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pendingCheckin}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">กำลังยืม</CardTitle>
            <Badge variant="secondary">CHECKED_IN</Badge>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeLoans}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/teacher/requests">ไปหน้าอนุมัติคำขอ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teacher/loans">ไปหน้า โต๊ะยืมคืน</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/teacher/qr">QR Token ของฉัน</Link>
        </Button>
      </div>
    </div>
  );
}
