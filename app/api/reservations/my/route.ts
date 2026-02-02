import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const requesterId = (session as any)?.uid as string | undefined;
  const role = (session as any)?.role as string | undefined;

  if (!requesterId || !["STUDENT", "TEACHER", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

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
