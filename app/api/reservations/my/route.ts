import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["STUDENT"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const rows = await prisma.reservation.findMany({
    where: { requesterId: auth.uid },
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
    })),
  });
}
