import type { Role } from "@/lib/auth/session";
import { roleToDashboardPath } from "@/lib/auth/role-dashboard";

export function dashboardHref(role?: Role) {
  return roleToDashboardPath(role, "/student");
}
