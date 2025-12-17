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
  icon: IconKey; // ✅ plain string
};

export const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: "dashboard" },
  { title: "Rooms", href: "/admin/rooms", icon: "calendar" },
  { title: "Keys", href: "/admin/keys", icon: "key" },
  { title: "Users", href: "/admin/users", icon: "users" },
  { title: "Loan Desk", href: "/admin/loans", icon: "key" },

  { title: "Settings", href: "/settings/password", icon: "settings" },
];

export const teacherNav: NavItem[] = [
  { title: "Dashboard", href: "/teacher", icon: "dashboard" },
  { title: "Approve Requests", href: "/teacher/requests", icon: "approve" },
  { title: "My Schedule", href: "/teacher/schedule", icon: "calendar" },
  { title: "Loan Desk", href: "/teacher/loans", icon: "key" },

  { title: "Settings", href: "/settings/password", icon: "settings" },
];

export const studentNav: NavItem[] = [
  { title: "Dashboard", href: "/student", icon: "dashboard" },
  { title: "Reserve Room", href: "/student/reserve", icon: "calendar" },
  { title: "My Reservations", href: "/student/reservations", icon: "calendar" },
  
  { title: "Settings", href: "/settings/password", icon: "settings" },
];
