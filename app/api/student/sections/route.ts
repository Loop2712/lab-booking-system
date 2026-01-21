import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["STUDENT"]);
  if (!auth.ok) return auth.response;

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
