import type { Role } from "@/lib/auth/session";

export function dashboardHref(role?: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/student";
}
