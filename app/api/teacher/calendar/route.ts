import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });
  }

  const fromDate = startOfDayUTC(from);
  const toDate = startOfDayUTC(to);

  const sections = await prisma.section.findMany({
    where: { teacherId: uid, isActive: true },
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
