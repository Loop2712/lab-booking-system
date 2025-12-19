import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isStudent(role?: string) {
  return role === "STUDENT";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  if (!isStudent(role)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await prisma.section.findMany({
    where: { isActive: true },
    include: {
      course: true,
      room: true,
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, items });
}
