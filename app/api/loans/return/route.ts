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
  const returnedById = vt.uid;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.reservationId },
        select: {
          id: true,
          status: true,
          type: true,
          requesterId: true,
          sectionId: true,
          loan: { select: { id: true, keyId: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
      if (resv.status !== "CHECKED_IN") return { ok: false as const, status: 400, message: "NOT_CHECKED_IN" };
      if (!resv.loan) return { ok: false as const, status: 400, message: "NO_LOAN" };

      // ✅ ตรวจสิทธิ์คนคืน (แนะนำให้ใช้ rule เดียวกับคนยืม)
      if (resv.type === "IN_CLASS") {
        if (!resv.sectionId) return { ok: false as const, status: 400, message: "MISSING_SECTION" };
        const enrolled = await tx.enrollment.findFirst({
          where: { sectionId: resv.sectionId, studentId: returnedById },
          select: { id: true },
        });
        if (!enrolled) return { ok: false as const, status: 403, message: "NOT_ALLOWED" };
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
        data: { checkedInAt: new Date(), returnedById },
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
