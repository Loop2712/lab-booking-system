import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["TEACHER"]);
  if (!auth.ok) return auth.response;

  const rows = await prisma.reservation.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      room: true,
      requester: true,
      section: true,
    },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      slot: r.slot,
      note: r.note,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      room: {
        code: r.room.code,
        name: r.room.name,
        roomNumber: r.room.roomNumber,
        floor: r.room.floor,
      },
      requester: {
        firstName: r.requester.firstName,
        lastName: r.requester.lastName,
        studentId: (r.requester as any).studentId ?? null,
        email: (r.requester as any).email ?? null,
      },
      section: r.section
        ? { code: (r.section as any).code ?? null, name: (r.section as any).name ?? null }
        : null,
    })),
  });
}
