import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  userToken: z.string().min(10),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER", "ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const handledById = guard.uid;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: body.error.flatten() },
      { status: 400 }
    );
  }

  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const returnedById = vt.uid;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.data.reservationId },
        select: {
          id: true,
          status: true,
          type: true,
          requesterId: true,
          sectionId: true,
          loan: { select: { id: true, keyId: true, borrowerId: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
      if (resv.status !== "CHECKED_IN") return { ok: false as const, status: 400, message: "NOT_CHECKED_IN" };
      if (!resv.loan) return { ok: false as const, status: 400, message: "NO_LOAN" };

      // ✅ ตรวจสิทธิ์คนคืน (แนะนำให้ใช้ rule เดียวกับคนยืม)
      if (resv.type === "IN_CLASS") {
        if (!resv.sectionId) return { ok: false as const, status: 400, message: "MISSING_SECTION" };
        if (resv.loan?.borrowerId !== returnedById) {
          const enrolled = await tx.enrollment.findFirst({
            where: { sectionId: resv.sectionId, studentId: returnedById },
            select: { id: true },
          });
          if (!enrolled) {
            const enrollCount = await tx.enrollment.count({ where: { sectionId: resv.sectionId } });
            if (enrollCount > 0) return { ok: false as const, status: 403, message: "NOT_ALLOWED" };
          }
        }
      } else {
        if (returnedById !== resv.requesterId) {
          const p = await tx.reservationParticipant.findFirst({
            where: { reservationId: resv.id, userId: returnedById },
            select: { id: true },
          });
          if (!p) return { ok: false as const, status: 403, message: "NOT_ALLOWED" };
        }
      }

      await tx.loan.update({
        where: { id: resv.loan.id },
        data: { checkedOutAt: new Date(), returnedById, handledById },
      });

      await tx.key.update({ where: { id: resv.loan.keyId }, data: { status: "AVAILABLE" } });
      await tx.reservation.update({ where: { id: resv.id }, data: { status: "COMPLETED" } });

      return { ok: true as const, status: 200 };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("RETURN_ERROR:", e);
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
