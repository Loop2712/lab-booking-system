// lib/auth/guard.ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export async function requireRole(roles: Role[]) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as Role | undefined;

  if (!session || !role) {
    redirect("/login");
    
  }

  if (!roles.includes(role)) {
    redirect("/forbidden");

  }

  return session as any;
}
