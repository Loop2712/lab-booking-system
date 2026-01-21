// lib/auth/guard.ts
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { NextResponse } from "next/server";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type AuthSession = Session & {
  uid?: string;
  role?: Role;
  user?: Session["user"] & { id?: string };
};

export async function requireRole(roles: Role[]) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  const role = session?.role;

  if (!session || !role) {
    redirect("/login");
  }

  if (!roles.includes(role)) {
    redirect("/forbidden");
  }

  return session;
}

export async function requireRoleApi(
  roles: Role[],
  options: { requireUid: true }
): Promise<{ ok: true; session: AuthSession; role: Role; uid: string } | { ok: false; response: NextResponse }>;
export async function requireRoleApi(
  roles: Role[],
  options?: { requireUid?: false }
): Promise<{ ok: true; session: AuthSession; role: Role; uid?: string } | { ok: false; response: NextResponse }>;
export async function requireRoleApi(
  roles: Role[],
  options?: { requireUid?: boolean }
) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  const role = session?.role;

  if (!session || !role) {
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

  const uid = session.uid ?? session.user?.id;
  if (options?.requireUid && !uid) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 }),
    };
  }

  return { ok: true as const, session, role, uid: uid as string | undefined };
}
