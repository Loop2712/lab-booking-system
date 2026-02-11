import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Role as RoleEnum, type Role } from "@/app/generated/prisma/enums";

export const ROLES = Object.values(RoleEnum) as Role[];

type SessionUser = Session["user"] & { id?: string };

export type AppSession = Session & {
  uid?: string;
  role?: Role;
  studentId?: string | null;
  user?: SessionUser;
};

export type AppSessionWithRole = AppSession & { role: Role };
export type AppSessionWithRoleAndUid = AppSessionWithRole & { uid: string };

const ROLE_SET = new Set<string>(ROLES);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLE_SET.has(value);
}

export async function getSession() {
  return getServerSession(authOptions);
}

export function getSessionRole(session: Session | null): Role | undefined {
  if (!session) return undefined;
  const role = (session as { role?: unknown }).role;
  return isRole(role) ? role : undefined;
}

export function getSessionUid(session: Session | null): string | undefined {
  if (!session) return undefined;
  const rawUid = (session as { uid?: unknown }).uid;
  if (typeof rawUid === "string" && rawUid.length > 0) return rawUid;

  const userId = session.user?.id;
  return typeof userId === "string" && userId.length > 0 ? userId : undefined;
}

export function getSessionStudentId(session: Session | null): string | null | undefined {
  if (!session) return undefined;
  const studentId = (session as { studentId?: unknown }).studentId;
  if (studentId === null) return null;
  return typeof studentId === "string" ? studentId : undefined;
}

export function getAppSession(session: Session | null): AppSession | null {
  if (!session) return null;

  return {
    ...session,
    role: getSessionRole(session),
    uid: getSessionUid(session),
    studentId: getSessionStudentId(session),
    user: session.user as SessionUser | undefined,
  };
}
