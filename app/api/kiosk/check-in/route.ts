import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authorizeReservationActor } from "@/lib/loans/reservation-access";
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

  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json(
      { ok: false, message: "BAD_QR_TOKEN", reason: vt.reason },
      { status: 400 }
    );
  }

  const borrowerId = vt.uid;

  const user = await prisma.user.findUnique({
    where: { id: borrowerId },
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
      const reservation = await tx.reservation.findUnique({
        where: { id: body.data.reservationId },
        select: {
          id: true,
          status: true,
          type: true,
          requesterId: true,
          roomId: true,
          startAt: true,
          sectionId: true,
          loan: { select: { id: true, borrowerId: true } },
          participants: { select: { userId: true } },
        },
      });

      if (!reservation) {
        return { ok: false as const, status: 404, message: "RESERVATION_NOT_FOUND" };
      }
      if (reservation.status !== "APPROVED") {
        return { ok: false as const, status: 400, message: "INVALID_STATUS" };
      }
      if (reservation.loan?.id) {
        return { ok: false as const, status: 400, message: "ALREADY_HAS_LOAN" };
      }

      const now = new Date();
      const lateLimit = new Date(reservation.startAt.getTime() + 30 * 60 * 1000);
      if (now > lateLimit) {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "NO_SHOW" },
        });
        return { ok: false as const, status: 400, message: "LATE_CHECKIN_NO_SHOW" };
      }

      const access = await authorizeReservationActor(tx, {
        actorId: borrowerId,
        action: "CHECKIN",
        reservation,
      });
      if (!access.ok) {
        return {
          ok: false as const,
          status: access.message === "MISSING_SECTION" ? 400 : 403,
          message: access.message,
        };
      }

      const key = await tx.key.findFirst({
        where: { roomId: reservation.roomId, status: "AVAILABLE" },
        select: { id: true },
      });

      if (!key) return { ok: false as const, status: 409, message: "NO_AVAILABLE_KEY" };

      await tx.loan.create({
        data: {
          reservationId: reservation.id,
          keyId: key.id,
          checkedInAt: new Date(),
          borrowerId,
        },
      });

      await tx.key.update({ where: { id: key.id }, data: { status: "BORROWED" } });
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "CHECKED_IN" } });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("KIOSK_CHECKIN_ERROR:", e);
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
