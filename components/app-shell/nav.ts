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
  icon: IconKey; //  plain string
};

export const adminNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/admin", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/rooms-today", icon: "calendar" },
  { title: "จัดการห้อง", href: "/admin/rooms", icon: "calendar" },
  { title: "จัดการกุญแจ", href: "/admin/keys", icon: "key" },
  { title: "จัดการผู้ใช้", href: "/admin/users", icon: "users" },
  { title: "รับกุญแจ / คืนกุญแจ", href: "/admin/check", icon: "key" },
  { title: "จัดการรายวิชา", href: "/admin/courses", icon: "key" },
  { title: "จัดการกลุ่มเรียน", href: "/admin/sections", icon: "key" },

  { title: "ตั้งค่า", href: "/settings/password", icon: "settings" },
];

export const teacherNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/teacher", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/rooms-today", icon: "calendar" },
  { title: "จองนอกตาราง", href: "/teacher/reserve", icon: "calendar" },
  { title: "อนุมัติคำขอ", href: "/teacher/requests", icon: "approve" },
  { title: "ตารางสอน", href: "/teacher/schedule", icon: "calendar" },
  { title: "รับกุญแจ / คืนกุญแจ", href: "/teacher/check", icon: "key" },

  { title: "ตั้งค่า", href: "/settings/password", icon: "settings" },
];

export const studentNav: NavItem[] = [
  { title: "แดชบอร์ด", href: "/student", icon: "dashboard" },
  { title: "ห้องที่ใช้งานวันนี้", href: "/rooms-today", icon: "calendar" },
  { title: "จองห้อง", href: "/student/reserve", icon: "calendar" },
  { title: "การจองของฉัน", href: "/student/reservations", icon: "calendar" },
  { title: "รับกุญแจ / คืนกุญแจ", href: "/student/check", icon: "key" },
  { title: "รายวิชาของฉัน", href: "/student/courses", icon: "key" },

  { title: "ตั้งค่า", href: "/settings/password", icon: "settings" },
];
