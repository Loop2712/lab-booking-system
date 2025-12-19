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
  { title: "Dashboard", href: "/admin", icon: "dashboard" },
  { title: "Rooms Today", href: "/rooms-today", icon: "calendar" },
  { title: "Rooms", href: "/admin/rooms", icon: "calendar" },
  { title: "Keys", href: "/admin/keys", icon: "key" },
  { title: "Users", href: "/admin/users", icon: "users" },
  { title: "Check-in / Check-out", href: "/admin/check", icon: "key" },
  { title: "Loan Desk", href: "/admin/loans", icon: "key" },
  { title: "Courses", href: "/admin/courses", icon: "key" },
  { title: "Sections", href: "/admin/sections", icon: "key" },

  { title: "Settings", href: "/settings/password", icon: "settings" },
];

export const teacherNav: NavItem[] = [
  { title: "Dashboard", href: "/teacher", icon: "dashboard" },
  { title: "Rooms Today", href: "/rooms-today", icon: "calendar" },
  { title: "Reserve (Ad-hoc)", href: "/teacher/reserve", icon: "calendar" },
  { title: "Approve Requests", href: "/teacher/requests", icon: "approve" },
  { title: "My Schedule", href: "/teacher/schedule", icon: "calendar" },
  { title: "Check-in / Check-out", href: "/teacher/check", icon: "key" },
  { title: "Loan Desk", href: "/teacher/loans", icon: "key" },

  { title: "Settings", href: "/settings/password", icon: "settings" },
];

export const studentNav: NavItem[] = [
  { title: "Dashboard", href: "/student", icon: "dashboard" },
  { title: "Rooms Today", href: "/rooms-today", icon: "calendar" },
  { title: "Reserve Room", href: "/student/reserve", icon: "calendar" },
  { title: "My Reservations", href: "/student/reservations", icon: "calendar" },
  { title: "Check-in / Check-out", href: "/student/check", icon: "key" },
  { title: "My Courses", href: "/student/courses", icon: "key" },

  { title: "Settings", href: "/settings/password", icon: "settings" },
];
