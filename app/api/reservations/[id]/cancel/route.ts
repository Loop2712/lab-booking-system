import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const requesterId = guard.uid;

  const found = await prisma.reservation.findFirst({
    where: { id, requesterId },
    select: { id: true, status: true, startAt: true },
  });

  if (!found) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }

  // ✅ อนุญาตยกเลิกได้ทั้ง PENDING และ APPROVED (ตามงานจริงที่ควรยกเลิกได้)
  if (found.status !== "PENDING" && found.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, message: "CANNOT_CANCEL_STATUS" },
      { status: 400 }
    );
  }

  // ✅ กฎ: ยกเลิกก่อนเริ่มอย่างน้อย 60 นาที
  const now = new Date();
  const cancelDeadline = new Date(found.startAt.getTime() - 60 * 60 * 1000);
  if (now > cancelDeadline) {
    return NextResponse.json(
      { ok: false, message: "CANCEL_TOO_LATE" },
      { status: 400 }
    );
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
