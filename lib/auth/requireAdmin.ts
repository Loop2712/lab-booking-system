import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";

export type AdminGuard =
  | { ok: true; session: any }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminGuard> {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  if (!session || role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, message: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session };
}
