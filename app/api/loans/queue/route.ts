import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER", "ADMIN"]);
  if (!guard.ok) return guard.response;

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
      loan: { is: { checkedOutAt: null } },
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
      loan: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          borrower: { select: { firstName: true, lastName: true, studentId: true, email: true } },
        },
      },
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
