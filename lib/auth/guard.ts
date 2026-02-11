// lib/auth/guard.ts
import { redirect } from "next/navigation";
import {
  getSession,
  getAppSession,
  type AppSessionWithRoleAndUid,
  type Role,
} from "@/lib/auth/session";

export async function requireRole(roles: Role[]): Promise<AppSessionWithRoleAndUid> {
  const session = await getSession();
  const appSession = getAppSession(session);
  const role = appSession?.role;
  const uid = appSession?.uid;

  if (!appSession || !role || !uid) {
    redirect("/login");
  }

  if (!roles.includes(role)) {
    redirect("/forbidden");
  }

  return appSession as AppSessionWithRoleAndUid;
}
