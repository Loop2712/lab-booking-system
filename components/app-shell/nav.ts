export type IconKey =
  | "dashboard"
  | "key"
  | "calendar"
  | "users"
  | "settings"
  | "approve";

export type NavItem = {
  title: string;
  href: string;
  icon: IconKey;
};

export const adminNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/admin", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/admin/rooms-today", icon: "calendar" },
  { title: "รายการจองของฉัน", href: "/admin/reservations", icon: "calendar" },
  { title: "ศูนย์จองห้อง", href: "/admin/reserve", icon: "calendar" },
  { title: "จัดการห้อง", href: "/admin/rooms", icon: "calendar" },
  { title: "จัดการกุญแจ", href: "/admin/keys", icon: "key" },
  { title: "จัดการผู้ใช้", href: "/admin/users", icon: "users" },
  { title: "ยืม-คืนกุญแจ", href: "/admin/check", icon: "key" },
  { title: "อุปกรณ์ Kiosk", href: "/admin/self-check", icon: "key" },
  { title: "ตั้งค่าเทอม (นำเข้า)", href: "/admin/term-setup", icon: "calendar" },
  { title: "จัดการกลุ่มเรียน", href: "/admin/sections", icon: "key" },
  { title: "รายงาน", href: "/admin/reports", icon: "dashboard" },
  { title: "ตั้งค่า", href: "/settings", icon: "settings" },
];

export const teacherNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/teacher", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/teacher/rooms-today", icon: "calendar" },
  { title: "รายการจองของฉัน", href: "/teacher/reservations", icon: "calendar" },
  { title: "ศูนย์จองห้อง", href: "/teacher/reserve", icon: "calendar" },
  { title: "อนุมัติคำขอ", href: "/teacher/requests", icon: "approve" },
  { title: "ตารางสอน", href: "/teacher/schedule", icon: "calendar" },
  { title: "ยืม-คืนกุญแจ", href: "/teacher/check", icon: "key" },
  { title: "ตั้งค่า", href: "/settings", icon: "settings" },
];

export const studentNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/student", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/student/rooms-today", icon: "calendar" },
  { title: "ศูนย์จองห้อง", href: "/student/reserve", icon: "calendar" },
  { title: "รายการจองของฉัน", href: "/student/reservations", icon: "calendar" },
  { title: "ยืม-คืนกุญแจ", href: "/student/check", icon: "key" },
  { title: "รายวิชาของฉัน", href: "/student/courses", icon: "key" },
  { title: "ตั้งค่า", href: "/settings", icon: "settings" },
];
