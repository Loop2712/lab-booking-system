import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";
import { requireScannerKey } from "../_util";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  userToken: z.string().min(10),
});

export async function POST(req: Request) {
  const gate = requireScannerKey(req);
  if (!gate.ok) return gate.res;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: body.error.flatten() },
      { status: 400 }
    );
  }

  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json(
      { ok: false, message: "BAD_QR_TOKEN", reason: vt.reason },
      { status: 400 }
    );
  }

  const borrowerId = vt.uid; // ✅ schema ใช้ borrowerId

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.data.reservationId },
        select: {
          id: true,
          status: true,
          requesterId: true,
          roomId: true,
          loan: { select: { id: true } },
          participants: { select: { userId: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "RESERVATION_NOT_FOUND" };
      if (resv.status !== "APPROVED") return { ok: false as const, status: 400, message: "INVALID_STATUS" };
      if (resv.loan?.id) return { ok: false as const, status: 400, message: "ALREADY_HAS_LOAN" };

      const okOwner =
        resv.requesterId === borrowerId || resv.participants.some((p) => p.userId === borrowerId);
      if (!okOwner) return { ok: false as const, status: 403, message: "NOT_OWNER" };

      const key = await tx.key.findFirst({
        where: { roomId: resv.roomId, status: "AVAILABLE" },
        select: { id: true },
      });
      if (!key) return { ok: false as const, status: 409, message: "NO_AVAILABLE_KEY" };

      // ✅ ทำให้เหมือนของเดิมใน /api/loans/check-in (schema ของคุณใช้ borrowerId)
      await tx.loan.create({
        data: {
          reservationId: resv.id,
          keyId: key.id,
          checkedOutAt: new Date(), // (ตามของเดิมในโปรเจค)
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
    console.error("KIOSK_CHECKIN_ERROR:", e);
    return NextResponse.json(
      { ok: false, message: "ERROR", detail: e?.message },
      { status: 500 }
    );
  }
}
