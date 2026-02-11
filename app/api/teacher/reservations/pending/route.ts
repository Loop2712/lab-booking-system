import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const rows = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      approverId: uid,
    },
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
