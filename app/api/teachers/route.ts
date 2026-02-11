import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const rawLimit = Number(url.searchParams.get("limit") || 100);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 100;

  const where = q.length >= 2
    ? {
        role: "TEACHER" as const,
        isActive: true,
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {
        role: "TEACHER" as const,
        isActive: true,
      };

  const items = await prisma.user.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: limit,
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  return NextResponse.json({ ok: true, items });
}
