import type { Session } from "next-auth";
import type { Role } from "@/app/generated/prisma/enums";
import { roleToDashboardPath } from "@/lib/auth/role-dashboard";

function isRole(value: unknown): value is Role {
  return value === "ADMIN" || value === "TEACHER" || value === "STUDENT";
}

function getSessionRole(session: Session | null): Role | undefined {
  if (!session) return undefined;
  const role = (session as { role?: unknown }).role;
  return isRole(role) ? role : undefined;
}

function normalizeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) return null;
  // prevent redirect loops or unsafe auth routes
  if (callbackUrl === "/login" || callbackUrl.startsWith("/api/auth")) return null;

  try {
    // If it's an absolute URL, only keep pathname+search
    if (callbackUrl.startsWith("http")) {
      const u = new URL(callbackUrl);
      return u.pathname + (u.search ?? "");
    }
  } catch {
    // ignore
  }

  if (!callbackUrl.startsWith("/")) return null;
  return callbackUrl;
}

function isCallbackAllowedForRole(path: string, role: Role | undefined) {
  if (!role) return false;
  if (path.startsWith("/admin")) return role === "ADMIN";
  if (path.startsWith("/teacher")) return role === "TEACHER";
  if (path.startsWith("/student")) return role === "STUDENT";
  return true;
}

export async function redirectAfterLogin(args: {
  callbackUrl: string;
  updateSession: () => Promise<Session | null>;
}) {
  const { callbackUrl, updateSession } = args;

  const newSession = await updateSession();
  const role = getSessionRole(newSession);

  const normalized = normalizeCallbackUrl(callbackUrl);
  const target =
    normalized && isCallbackAllowedForRole(normalized, role)
      ? normalized
      : roleToDashboardPath(role, "/");

  window.location.href = target;
}
