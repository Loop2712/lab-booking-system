import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function canUse(role?: string) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  if (!canUse(role)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1) รอรับกุญแจ: ครูอนุมัติแล้ว แต่ยังไม่ CHECKED_IN
  const pendingCheckin = await prisma.reservation.findMany({
    where: {
      status: "APPROVED",
      loan: null,
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      slot: true,
      startAt: true,
      endAt: true,
      note: true,
      room: { select: { code: true, name: true, roomNumber: true, floor: true } },
      requester: { select: { firstName: true, lastName: true, studentId: true, email: true } },
      approver: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // 2) กำลังยืม: CHECKED_IN แล้ว และยังไม่ COMPLETED
  const activeLoans = await prisma.reservation.findMany({
    where: {
      status: "CHECKED_IN",
      loan: { isNot: null },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      slot: true,
      startAt: true,
      endAt: true,
      note: true,
      room: { select: { code: true, name: true, roomNumber: true, floor: true } },
      requester: { select: { firstName: true, lastName: true, studentId: true, email: true } },
      loan: { select: { id: true, createdAt: true, updatedAt: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    pendingCheckin: pendingCheckin.map((r) => ({
      ...r,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
    })),
    activeLoans: activeLoans.map((r) => ({
      ...r,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      loan: r.loan
        ? {
            ...r.loan,
            createdAt: r.loan.createdAt.toISOString(),
            updatedAt: r.loan.updatedAt.toISOString(),
          }
        : null,
    })),
  });
}
