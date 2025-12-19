import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isStudent(role?: string) {
  return role === "STUDENT";
}

const addSchema = z.object({
  sectionId: z.string().min(1),
});

const delSchema = z.object({
  sectionId: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isStudent(role) || !uid) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const items = await prisma.enrollment.findMany({
    where: { studentId: uid },
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
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isStudent(role) || !uid) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const body = addSchema.parse(await req.json());

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
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isStudent(role) || !uid) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

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
