import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["TEACHER"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const items = await prisma.section.findMany({
    where: { teacherId: auth.uid, isActive: true },
    include: {
      course: true,
      room: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}
