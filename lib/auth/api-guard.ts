import { NextResponse } from "next/server";

export type ApiRole = "ADMIN" | "TEACHER" | "STUDENT";

export function requireApiRole(
  session: any,
  roles: ApiRole[],
  options: { requireUid?: boolean } = {}
) {
  const role = session?.role as ApiRole | undefined;
  const uid = session?.uid as string | undefined;
  const requireUid = options.requireUid ?? false;

  if (!session || !role || !roles.includes(role) || (requireUid && !uid)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { ok: true as const, session, role, uid };
}
