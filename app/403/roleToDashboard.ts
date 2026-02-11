import type { Role } from "@/lib/auth/session";

export function roleToDashboard(role?: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  if (role === "STUDENT") return "/student";
  return "/login";
}
