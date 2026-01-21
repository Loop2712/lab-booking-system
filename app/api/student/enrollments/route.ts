import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const addSchema = z.object({
  sectionId: z.string().min(1),
});

const delSchema = z.object({
  sectionId: z.string().min(1),
});

export async function GET() {
  const auth = await requireRoleApi(["STUDENT"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const items = await prisma.enrollment.findMany({
    where: { studentId: auth.uid },
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
  const auth = await requireRoleApi(["STUDENT"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const body = addSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const created = await prisma.enrollment.create({
    data: {
      studentId: auth.uid,
      sectionId: body.data.sectionId,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}

export async function DELETE(req: Request) {
  const auth = await requireRoleApi(["STUDENT"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const body = delSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  await prisma.enrollment.delete({
    where: {
      studentId_sectionId: {
        studentId: auth.uid,
        sectionId: body.data.sectionId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
