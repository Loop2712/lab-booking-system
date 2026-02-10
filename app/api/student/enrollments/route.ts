import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const MAX_SECTION_ENROLLMENTS = 40;

const addSchema = z.object({
  sectionId: z.string().min(1),
});

const delSchema = z.object({
  sectionId: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const items = await prisma.enrollment.findMany({
    where: {
      studentId: uid,
      section: {
        term: {
          isActive: true,
          endDate: { gte: now },
        },
      },
    },
    include: {
      section: {
        include: {
          course: true,
          room: true,
          teacher: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = addSchema.parse(await req.json());

  const section = await prisma.section.findUnique({
    where: { id: body.sectionId },
    select: {
      id: true,
      isActive: true,
      term: { select: { isActive: true, endDate: true } },
    },
  });
  if (!section) {
    return NextResponse.json({ ok: false, message: "SECTION_NOT_FOUND" }, { status: 404 });
  }
  if (!section.isActive) {
    return NextResponse.json({ ok: false, message: "SECTION_INACTIVE" }, { status: 400 });
  }
  const now = new Date();
  if (!section.term || !section.term.isActive || section.term.endDate < now) {
    return NextResponse.json({ ok: false, message: "SECTION_INACTIVE" }, { status: 400 });
  }

  const currentCount = await prisma.enrollment.count({
    where: { sectionId: body.sectionId },
  });
  if (currentCount >= MAX_SECTION_ENROLLMENTS) {
    return NextResponse.json(
      { ok: false, message: "SECTION_FULL", detail: { max: MAX_SECTION_ENROLLMENTS } },
      { status: 400 }
    );
  }

  const created = await prisma.enrollment.create({
    data: {
      studentId: uid,
      sectionId: body.sectionId,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = delSchema.parse(await req.json());

  await prisma.enrollment.delete({
    where: {
      studentId_sectionId: {
        studentId: uid,
        sectionId: body.sectionId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
