import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSessionUid } from "@/lib/auth/session";
import { getReservationStatusLabel } from "@/lib/reservations/status";
import {
  Calendar,
  KeyRound,
  ListTodo,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  const uid = getSessionUid(session);
  if (!uid) {
    return null;
  }

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

  const stats = [
    { label: "รายการทั้งหมด", value: total, icon: ListTodo, color: "text-foreground" },
    { label: getReservationStatusLabel("PENDING"), value: pending, icon: Clock, color: "text-amber-600" },
    { label: getReservationStatusLabel("APPROVED"), value: approved, icon: Calendar, color: "text-blue-600" },
    { label: getReservationStatusLabel("CHECKED_IN"), value: checkedIn, icon: KeyRound, color: "text-emerald-600" },
    { label: getReservationStatusLabel("COMPLETED"), value: completed, icon: CheckCircle2, color: "text-muted-foreground" },
    { label: "ปฏิเสธ/ยกเลิก", value: rejected + cancelled, icon: XCircle, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">หน้าหลัก</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ภาพรวมรายการจองห้องปฏิบัติการของคุณ
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden border-0 bg-card shadow-sm ring-1 ring-black/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`rounded-lg bg-muted/60 p-2 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border bg-muted/30 p-6 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-foreground mb-4">ทำอะไรต่อดี</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link href="/student/reserve">
              <Calendar className="h-4 w-4" />
              จองห้อง
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/student/reservations">
              <ListTodo className="h-4 w-4" />
              รายการจองของฉัน
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/student/check">
              <QrCode className="h-4 w-4" />
              แสดง QR ยืม-คืนกุญแจ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
