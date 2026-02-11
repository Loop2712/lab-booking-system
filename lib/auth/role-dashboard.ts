import type { Role } from "@/lib/auth/session";

export function roleToDashboardPath(role: Role | undefined, fallback: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  if (role === "STUDENT") return "/student";
  return fallback;
}
