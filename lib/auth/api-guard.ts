import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getAppSession, type Role } from "@/lib/auth/session";

export function requireApiRole(
  session: Session | null,
  roles: Role[],
  options: { requireUid?: boolean } = {}
) {
  const appSession = getAppSession(session);
  const role = appSession?.role;
  const uid = appSession?.uid;
  const requireUid = options.requireUid ?? false;

  if (!appSession || !role || (requireUid && !uid)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  if (!roles.includes(role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return { ok: true as const, session: appSession, role, uid };
}
