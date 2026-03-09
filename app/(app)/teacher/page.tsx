import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  KeyRound,
  Clock,
  QrCode,
  Calendar,
  BookOpen,
} from "lucide-react";

export default async function TeacherDashboard() {
  const [pendingRequests, pendingCheckin, activeLoans] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({ where: { status: "APPROVED", loan: null } }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
  ]);

  const stats = [
    { label: "คำขอรออนุมัติ", value: pendingRequests, icon: ClipboardList, desc: "รายการที่รอคุณอนุมัติ", color: "text-amber-600" },
    { label: "รอรับกุญแจ", value: pendingCheckin, icon: Clock, desc: "อนุมัติแล้ว รอมาหยิบกุญแจ", color: "text-blue-600" },
    { label: "กำลังยืมอยู่", value: activeLoans, icon: KeyRound, desc: "มีการเช็คอินแล้ว", color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">หน้าหลัก</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ภาพรวมคำขอจองและการยืม-คืนกุญแจ
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, desc, color }) => (
          <Card key={label} className="overflow-hidden border-0 bg-card shadow-sm ring-1 ring-black/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`rounded-lg bg-muted/60 p-2 ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl border bg-muted/30 p-6 ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-foreground mb-4">เมนูหลัก</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2 shadow-sm">
            <Link href="/teacher/requests">
              <ClipboardList className="h-4 w-4" />
              คำขอจอง
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/teacher/check">
              <KeyRound className="h-4 w-4" />
              ยืม-คืนกุญแจ
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/teacher/calendar">
              <Calendar className="h-4 w-4" />
              ปฏิทิน
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/teacher/reservations">
              <BookOpen className="h-4 w-4" />
              รายการจองของฉัน
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/teacher/qr">
              <QrCode className="h-4 w-4" />
              QR / Token
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
