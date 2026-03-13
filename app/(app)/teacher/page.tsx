import { prisma } from "@/lib/db/prisma";
import { getReservationStatusLabel } from "@/lib/reservations/status";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  KeyRound,
  QrCode,
} from "lucide-react";
import {
  DashboardActionGrid,
  DashboardHero,
  DashboardMetricGrid,
} from "@/components/dashboard/DashboardKit";

export default async function TeacherDashboard() {
  const [pendingRequests, pendingCheckin, activeLoans] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({ where: { status: "APPROVED", loan: null } }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
  ]);

  const heroMeta = [
    {
      label: "คำขอรออนุมัติ",
      value: pendingRequests,
      icon: ClipboardList,
    },
    {
      label: "รอรับกุญแจ",
      value: pendingCheckin,
      icon: Clock,
    },
    {
      label: "กำลังใช้งาน",
      value: activeLoans,
      icon: KeyRound,
    },
  ] as const;

  const metricItems = [
    {
      title: getReservationStatusLabel("PENDING"),
      value: pendingRequests,
      description: "รายการที่รอการอนุมัติหรือการพิจารณาเพิ่มเติม",
      icon: ClipboardList,
      tone: "warning" as const,
    },
    {
      title: "รอรับกุญแจ",
      value: pendingCheckin,
      description: "รายการที่อนุมัติแล้วและกำลังรอรับกุญแจหน้าเคาน์เตอร์",
      icon: Clock,
      tone: "info" as const,
    },
    {
      title: getReservationStatusLabel("CHECKED_IN"),
      value: activeLoans,
      description: "รายการที่เช็คอินแล้วและอยู่ระหว่างการใช้ห้อง",
      icon: KeyRound,
      tone: "success" as const,
    },
  ];

  const actionItems = [
    {
      href: "/teacher/requests",
      title: "คำขอจอง",
      description: "ตรวจสอบและจัดการคำขอจองที่เกี่ยวข้องกับการสอน",
      icon: ClipboardList,
    },
    {
      href: "/teacher/check",
      title: "ยืม-คืนกุญแจ",
      description: "ดูขั้นตอนรับกุญแจ คืนกุญแจ และสถานะการเข้าใช้งาน",
      icon: KeyRound,
    },
    {
      href: "/teacher/calendar",
      title: "ปฏิทิน",
      description: "ดูภาพรวมการจองและตารางใช้งานในรูปแบบปฏิทิน",
      icon: Calendar,
    },
    {
      href: "/teacher/reservations",
      title: "รายการจองของฉัน",
      description: "ตรวจสอบรายการจองทั้งหมดที่สร้างหรือเกี่ยวข้องกับคุณ",
      icon: BookOpen,
    },
    {
      href: "/teacher/qr",
      title: "QR / Token",
      description: "เปิดหน้าสำหรับแสดง QR และการยืนยันตัวตนหน้างาน",
      icon: QrCode,
    },
    {
      href: "/teacher/schedule",
      title: "ตารางสอน",
      description: "ดูตารางเรียนและข้อมูล section ที่เชื่อมกับห้อง",
      icon: CheckCircle2,
    },
  ];

  const asideItems = [
    `คำขอที่ยังรออยู่ ${pendingRequests} รายการ`,
    `มี ${pendingCheckin} รายการที่พร้อมรับกุญแจ`,
    `กำลังใช้งานห้องอยู่ ${activeLoans} รายการ`,
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="Teacher Dashboard"
        title="แดชบอร์ดอาจารย์"
        description="รวมมุมมองคำขอจอง การรับกุญแจ และรายการใช้งานห้องที่เกี่ยวข้องกับงานสอนให้ตรวจสอบได้เร็วขึ้นในโครงหน้าที่เหมือนกันกับทุก dashboard"
        meta={heroMeta}
        asideTitle="สิ่งที่ควรตรวจตอนนี้"
        asideDescription="สถานะหลักที่ควรติดตามก่อนเข้าสู่หน้าจัดการย่อย"
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
        title="สรุปงานที่ต้องติดตาม"
        description="ตัวเลขหลักที่ช่วยให้เห็นสถานะคำขอและการใช้งานห้องอย่างรวดเร็ว"
        items={metricItems}
        columnsClassName="md:grid-cols-3"
      />

      <DashboardActionGrid
        title="เมนูใช้งานหลัก"
        description="เข้าถึงหน้าที่ใช้บ่อยสำหรับอนุมัติคำขอ ตรวจสอบสถานะ และติดตามการจอง"
        items={actionItems}
      />
    </div>
  );
}
