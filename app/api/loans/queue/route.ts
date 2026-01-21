import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["TEACHER", "ADMIN"]);
  if (!auth.ok) return auth.response;

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
