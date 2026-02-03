import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";
import { requireKioskDevice } from "@/lib/kiosk-device";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  userToken: z.string().min(10),
});

export async function POST(req: Request) {
  const gate = await requireKioskDevice();
  if (!gate.ok) return gate.res;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: body.error.flatten() },
      { status: 400 }
    );
  }

  // 1) Verify QR token
  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json(
      { ok: false, message: "BAD_QR_TOKEN", reason: vt.reason },
      { status: 400 }
    );
  }

  const returnedById = vt.uid; // ✅ schema ใช้ returnedById

  // ✅ 2) Role guard: allow only STUDENT / TEACHER
  const user = await prisma.user.findUnique({
    where: { id: returnedById },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  if (user.role !== "STUDENT" && user.role !== "TEACHER") {
    return NextResponse.json({ ok: false, message: "ROLE_NOT_ALLOWED" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.data.reservationId },
        select: {
          id: true,
          status: true,
          requesterId: true,
          loan: { select: { id: true, keyId: true, borrowerId: true } },
          participants: { select: { userId: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "RESERVATION_NOT_FOUND" };
      if (resv.status !== "CHECKED_IN")
        return { ok: false as const, status: 400, message: "INVALID_STATUS" };
      if (!resv.loan?.id) return { ok: false as const, status: 400, message: "NO_LOAN" };

      // 3) Ownership check: requester/participant/borrower
      const okOwner =
        resv.requesterId === returnedById ||
        resv.participants.some((p) => p.userId === returnedById) ||
        resv.loan?.borrowerId === returnedById;
      if (!okOwner) return { ok: false as const, status: 403, message: "NOT_OWNER" };

      // ✅ ทำให้เหมือนของเดิมใน /api/loans/return
      await tx.loan.update({
        where: { id: resv.loan.id },
        data: { checkedOutAt: new Date(), returnedById },
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
    console.error("KIOSK_RETURN_ERROR:", e);
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
