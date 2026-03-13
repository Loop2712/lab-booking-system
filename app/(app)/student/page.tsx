import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { getSessionUid } from "@/lib/auth/session";
import { getReservationStatusLabel } from "@/lib/reservations/status";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  KeyRound,
  ListTodo,
  QrCode,
} from "lucide-react";
import {
  DashboardActionGrid,
  DashboardHero,
  DashboardMetricGrid,
} from "@/components/dashboard/DashboardKit";

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

  const counts = Object.fromEntries(
    groups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pending = counts.PENDING ?? 0;
  const approved = counts.APPROVED ?? 0;
  const checkedIn = counts.CHECKED_IN ?? 0;
  const completed = counts.COMPLETED ?? 0;
  const rejected = counts.REJECTED ?? 0;
  const cancelled = counts.CANCELLED ?? 0;

  const heroMeta = [
    {
      label: "รายการทั้งหมด",
      value: total,
      icon: ListTodo,
    },
    {
      label: getReservationStatusLabel("APPROVED"),
      value: approved,
      icon: Calendar,
    },
    {
      label: getReservationStatusLabel("CHECKED_IN"),
      value: checkedIn,
      icon: KeyRound,
    },
  ] as const;

  const metricItems = [
    {
      title: getReservationStatusLabel("PENDING"),
      value: pending,
      description: "รายการที่รอการตรวจสอบหรืออนุมัติ",
      icon: Clock,
      tone: "warning" as const,
    },
    {
      title: getReservationStatusLabel("APPROVED"),
      value: approved,
      description: "รายการที่อนุมัติแล้วและพร้อมใช้งานตามเวลา",
      icon: CalendarClock,
      tone: "info" as const,
    },
    {
      title: getReservationStatusLabel("CHECKED_IN"),
      value: checkedIn,
      description: "รายการที่รับกุญแจแล้วและอยู่ระหว่างการใช้งาน",
      icon: KeyRound,
      tone: "success" as const,
    },
    {
      title: getReservationStatusLabel("COMPLETED"),
      value: completed,
      description: "รายการที่ใช้งานเสร็จสิ้นและคืนกุญแจแล้ว",
      icon: CheckCircle2,
      tone: "neutral" as const,
    },
    {
      title: "ปฏิเสธ/ยกเลิก",
      value: rejected + cancelled,
      description: "รายการที่ไม่ได้ดำเนินการต่อหรือถูกยกเลิก",
      icon: ListTodo,
      tone: "danger" as const,
    },
  ];

  const actionItems = [
    {
      href: "/student/reserve",
      title: "จองห้อง",
      description: "ค้นหาห้องที่ว่างและสร้างรายการจองใหม่",
      icon: Calendar,
    },
    {
      href: "/student/reservations",
      title: "รายการจองของฉัน",
      description: "ดูสถานะรายการจองย้อนหลังและรายการที่ยังใช้งานอยู่",
      icon: ListTodo,
    },
    {
      href: "/student/check",
      title: "แสดง QR ยืม-คืนกุญแจ",
      description: "ใช้ QR สำหรับยืนยันตัวตนที่จุดยืม-คืนกุญแจ",
      icon: QrCode,
    },
    {
      href: "/student/calendar",
      title: "ปฏิทินการจอง",
      description: "ดูการจองของคุณในรูปแบบปฏิทินรายวันและรายสัปดาห์",
      icon: CalendarClock,
    },
    {
      href: "/student/rooms-today",
      title: "ห้องว่างวันนี้",
      description: "ตรวจสอบภาพรวมห้องที่ว่างและห้องที่กำลังใช้งานวันนี้",
      icon: KeyRound,
    },
    {
      href: "/student/courses",
      title: "รายวิชา",
      description: "ดูรายวิชาและข้อมูล section ที่เชื่อมกับการใช้งานห้อง",
      icon: BookOpen,
    },
  ];

  const asideItems = [
    `มีรายการอนุมัติแล้ว ${approved} รายการ`,
    `กำลังใช้งานอยู่ ${checkedIn} รายการ`,
    `สะสมการจองทั้งหมด ${total} รายการ`,
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="Student Dashboard"
        title="แดชบอร์ดนักศึกษา"
        description="รวมภาพรวมการจองของคุณไว้ในหน้าเดียว ทั้งสถานะล่าสุด การเข้าถึงเมนูที่ใช้บ่อย และมุมมองที่สอดคล้องกับ dashboard ของ role อื่นในระบบ"
        meta={heroMeta}
        asideTitle="สรุปการใช้งานล่าสุด"
        asideDescription="ใช้จุดนี้เป็นภาพรวมก่อนเข้าสู่การจองหรือจัดการรายการของคุณ"
        aside={
          <div className="space-y-3">
            {asideItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--brand-light-gray-line)] bg-[var(--brand-light-gray)]/70 px-4 py-3 text-sm text-[var(--brand-gray-dark)]"
              >
                {item}
              </div>
            ))}
          </div>
        }
      />

      <DashboardMetricGrid
        title="สรุปสถานะการจอง"
        description="ดูจำนวนรายการในแต่ละสถานะเพื่อวางแผนการใช้งานห้องได้สะดวกขึ้น"
        items={metricItems}
        columnsClassName="md:grid-cols-2 xl:grid-cols-5"
      />

      <DashboardActionGrid
        title="เมนูใช้งานหลัก"
        description="ทางลัดสำหรับการจองห้อง ตรวจสอบสถานะ และใช้งานฟีเจอร์สำคัญในระบบ"
        items={actionItems}
      />
    </div>
  );
}
