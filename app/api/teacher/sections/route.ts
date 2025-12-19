import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isTeacher(role?: string) {
  return role === "TEACHER";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isTeacher(role) || !uid) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const items = await prisma.section.findMany({
    where: { teacherId: uid, isActive: true },
    include: {
      course: true,
      room: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items });
}
