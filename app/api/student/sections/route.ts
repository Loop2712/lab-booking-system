import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT"]);
  if (!guard.ok) return guard.response;

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
