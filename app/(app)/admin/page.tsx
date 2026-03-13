import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileText,
  Key,
  KeyRound,
  Settings,
  Users,
} from "lucide-react";
import AdminRoomsStatusTable from "./_components/admin-rooms-status-table";
import { getAdminDashboardMetrics } from "./_data/dashboard-metrics";
import {
  DashboardActionGrid,
  DashboardHero,
  DashboardMetricGrid,
} from "@/components/dashboard/DashboardKit";

export default async function AdminDashboard() {
  const metrics = await getAdminDashboardMetrics();

  const heroMeta = [
    {
      label: "คำขอรออนุมัติ",
      value: metrics.pendingRequests,
      icon: ClipboardList,
    },
    {
      label: "กำลังใช้งาน",
      value: metrics.activeLoans,
      icon: KeyRound,
    },
    {
      label: "ห้องที่เปิดใช้งาน",
      value: metrics.roomsActive,
      icon: DoorOpen,
    },
  ] as const;

  const metricItems = [
    {
      title: "คำขอรออนุมัติ",
      value: metrics.pendingRequests,
      description: "รายการที่ยังรอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ",
      icon: ClipboardList,
      tone: "warning" as const,
    },
    {
      title: "รอรับกุญแจ",
      value: metrics.pendingCheckin,
      description: "รายการที่อนุมัติแล้วแต่ผู้ใช้ยังไม่ได้รับกุญแจ",
      icon: KeyRound,
      tone: "info" as const,
    },
    {
      title: "กำลังใช้งาน",
      value: metrics.activeLoans,
      description: "รายการที่เช็คอินแล้วและอยู่ระหว่างการใช้ห้อง",
      icon: Key,
      tone: "danger" as const,
    },
    {
      title: "ห้องที่เปิดใช้งาน",
      value: metrics.roomsActive,
      description: "จำนวนห้องที่พร้อมให้จองในระบบ",
      icon: DoorOpen,
      tone: "neutral" as const,
    },
    {
      title: "กุญแจว่าง",
      value: metrics.keysAvailable,
      description: "กุญแจที่พร้อมให้ยืมในช่วงเวลาปัจจุบัน",
      icon: Key,
      tone: "success" as const,
    },
    {
      title: "กุญแจถูกยืม",
      value: metrics.keysBorrowed,
      description: "กุญแจที่ถูกยืมออกไปและยังไม่คืน",
      icon: KeyRound,
      tone: "danger" as const,
    },
  ];

  const actionItems = [
    {
      href: "/admin/rooms",
      title: "จัดการห้อง",
      description: "เพิ่ม แก้ไข หรือเปิดปิดสถานะห้องในระบบ",
      icon: DoorOpen,
    },
    {
      href: "/admin/keys",
      title: "จัดการกุญแจ",
      description: "ตรวจสอบสถานะกุญแจและข้อมูลการผูกกับห้อง",
      icon: Key,
    },
    {
      href: "/admin/sections",
      title: "ตารางเรียน",
      description: "ดูแล section วิชาและข้อมูลใช้งานห้องตามตารางเรียน",
      icon: CalendarDays,
    },
    {
      href: "/admin/users",
      title: "ผู้ใช้งาน",
      description: "บริหารข้อมูลนักศึกษา อาจารย์ และผู้ดูแลระบบ",
      icon: Users,
    },
    {
      href: "/admin/reports",
      title: "รายงาน",
      description: "ค้นหา สรุป และส่งออกข้อมูลการจองเป็น PDF",
      icon: FileText,
    },
    {
      href: "/admin/term-setup",
      title: "ตั้งค่าภาคเรียน",
      description: "อัปเดตข้อมูล term และช่วงเวลาที่ใช้ในระบบ",
      icon: Settings,
    },
  ];

  const focusLinks = [
    {
      href: "/teacher/requests",
      title: "ตรวจคำขอจอง",
      value: `${metrics.pendingRequests} รายการ`,
    },
    {
      href: "/admin/check",
      title: "ติดตามการยืม-คืนกุญแจ",
      value: `${metrics.activeLoans} รายการกำลังใช้งาน`,
    },
    {
      href: "/admin/reports",
      title: "ออกรายงานการใช้งาน",
      value: "สรุปข้อมูลและส่งออก PDF",
    },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        badge="Admin Dashboard"
        title="แดชบอร์ดผู้ดูแลระบบ"
        description="ติดตามภาพรวมการจองห้อง สถานะกุญแจ และงานที่ต้องดำเนินการในระบบจากหน้าเดียวด้วยโครงข้อมูลที่อ่านง่ายและสอดคล้องกัน"
        meta={heroMeta}
        asideTitle="งานที่ควรจัดการต่อ"
        asideDescription="ลิงก์ด่วนสำหรับงานประจำที่ผู้ดูแลระบบใช้งานบ่อยที่สุด"
        aside={
          <div className="space-y-3">
            {focusLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl border border-[var(--brand-light-gray-line)] bg-[var(--brand-light-gray)]/70 px-4 py-3 transition hover:border-[var(--brand-line-green)] hover:bg-[var(--brand-light-green)]/60"
              >
                <div className="font-medium text-[var(--brand-gray-dark)]">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {item.value}
                </div>
              </Link>
            ))}
          </div>
        }
      />

      <DashboardMetricGrid
        title="สรุปสถานะระบบ"
        description="ตัวเลขสำคัญที่ใช้ติดตามภาระงานและทรัพยากรที่พร้อมใช้งาน"
        items={metricItems}
      />

      <DashboardActionGrid
        title="เมนูจัดการหลัก"
        description="จุดเข้าใช้งานหลักสำหรับการดูแลข้อมูลและจัดการระบบ"
        items={actionItems}
      />

      <AdminRoomsStatusTable />
    </div>
  );
}
