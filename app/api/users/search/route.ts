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
  const rawLimit = Number(url.searchParams.get("limit") || 8);
  const limit = Number.isFinite(rawLimit) ? Math.min(rawLimit, 20) : 8;

  if (q.length < 2) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const items = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      OR: [
        { studentId: { startsWith: q } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { firstName: "asc" },
    take: limit,
    select: { id: true, firstName: true, lastName: true, studentId: true, email: true },
  });

  return NextResponse.json({ ok: true, items });
}
