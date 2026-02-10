import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;

  const now = new Date();
  const items = await prisma.section.findMany({
    where: {
      teacherId: uid,
      isActive: true,
      term: {
        isActive: true,
        endDate: { gte: now },
      },
    },
    include: {
      course: true,
      room: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}
