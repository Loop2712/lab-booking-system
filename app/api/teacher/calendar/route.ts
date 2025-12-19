import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isTeacher(role?: string) {
  return role === "TEACHER";
}

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isTeacher(role) || !uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

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
