import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { getReservationStatusInfo } from "@/lib/reservations/status";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const requesterId = guard.uid;

  const rows = await prisma.reservation.findMany({
    where: { requesterId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      date: true,
      slot: true,
      startAt: true,
      endAt: true,
      note: true,
      createdAt: true,
      room: { select: { code: true, name: true, roomNumber: true, floor: true } },
      section: { select: { course: { select: { code: true, name: true } } } },
    },
  });

  // ส่งเป็น plain JSON (กันปัญหา Date ข้ามฝั่ง)
  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      ...r,
      date: r.date.toISOString(),
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      ...getReservationStatusInfo(r.status),
    })),
  });
}
