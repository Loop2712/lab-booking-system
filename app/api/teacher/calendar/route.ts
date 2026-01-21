import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";
import { startOfDayUTC } from "@/lib/datetime";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireRoleApi(["TEACHER"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });
  }

  const fromDate = startOfDayUTC(from);
  const toDate = startOfDayUTC(to);

  const sections = await prisma.section.findMany({
    where: { teacherId: auth.uid, isActive: true },
    include: {
      course: true,
      room: true,
      _count: { select: { enrollments: true } },
    },
  });

  const sectionIds = sections.map((s) => s.id);

  const inClass = await prisma.reservation.findMany({
    where: {
      type: "IN_CLASS",
      sectionId: { in: sectionIds },
      date: { gte: fromDate, lte: toDate },
    },
    include: {
      room: true,
      section: { include: { course: true } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  return NextResponse.json({ ok: true, sections, reservations: { inClass } });
}
