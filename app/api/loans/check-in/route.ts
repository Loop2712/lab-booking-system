import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  userToken: z.string().min(10),
});

function canUse(role?: string) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  if (!canUse(role)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = bodySchema.parse(await req.json());

  const vt = verifyUserQrToken(body.userToken);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const borrowerId = vt.uid;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.reservationId },
        select: {
          id: true,
          status: true,
          type: true,
          requesterId: true,
          roomId: true,
          sectionId: true,
          startAt: true,
          loan: { select: { id: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
     if (resv.status !== "APPROVED") return { ok: false as const, status: 400, message: "NOT_APPROVED" };
      if (resv.loan) return { ok: false as const, status: 400, message: "ALREADY_CHECKED_IN" };

      // ✅ กฎ: check-in เลทเกิน 30 นาที => NO_SHOW
        const now = new Date();
        const lateLimit = new Date(resv.startAt.getTime() + 30 * 60 * 1000);

        if (now > lateLimit) {
          await tx.reservation.update({
            where: { id: resv.id },
            data: { status: "NO_SHOW" },
          });

          return { ok: false as const, status: 400, message: "LATE_CHECKIN_NO_SHOW" };
        }

      // ✅ ตรวจสิทธิ์คนยืมตามประเภท
      if (resv.type === "IN_CLASS") {
        if (!resv.sectionId) return { ok: false as const, status: 400, message: "MISSING_SECTION" };
        const enrolled = await tx.enrollment.findFirst({
          where: { sectionId: resv.sectionId, studentId: borrowerId },
          select: { id: true },
        });
        if (!enrolled) return { ok: false as const, status: 403, message: "NOT_ALLOWED" };
      } else {
        // AD_HOC: requester หรือ participant
        if (borrowerId !== resv.requesterId) {
          const p = await tx.reservationParticipant.findFirst({
            where: { reservationId: resv.id, userId: borrowerId },
            select: { id: true },
          });
          if (!p) return { ok: false as const, status: 403, message: "NOT_ALLOWED" };
        }
      }

      // ✅ หา key ว่าง (ห้องละ 1 key ก็จะเจอ/ไม่เจอตามสถานะ)
      const key = await tx.key.findFirst({
        where: { roomId: resv.roomId, status: "AVAILABLE" },
        select: { id: true },
      });
      if (!key) return { ok: false as const, status: 400, message: "NO_AVAILABLE_KEY" };

      // ✅ create loan + ผูก borrower
      await tx.loan.create({
        data: {
          reservationId: resv.id,
          keyId: key.id,
          checkedOutAt: new Date(),
          borrowerId,
        },
      });

      await tx.key.update({ where: { id: key.id }, data: { status: "BORROWED" } });
      await tx.reservation.update({ where: { id: resv.id }, data: { status: "CHECKED_IN" } });

      return { ok: true as const, status: 200 };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("CHECKIN_ERROR:", e);
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
