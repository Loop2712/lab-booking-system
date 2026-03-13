import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { authorizeReservationActor } from "@/lib/loans/reservation-access";
import { verifyUserQrToken } from "@/lib/security/user-qr";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
  userToken: z.string().min(10),
  allowLateOverride: z.boolean().optional(),
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

  const allowLateOverride = guard.role === "ADMIN" && body.data.allowLateOverride === true;

  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const borrowerId = vt.uid;

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
          sectionId: true,
          startAt: true,
          participants: { select: { userId: true } },
          loan: { select: { id: true, borrowerId: true } },
        },
      });

      if (!reservation) return { ok: false as const, status: 404, message: "NOT_FOUND" };
      if (reservation.status === "NO_SHOW" && !allowLateOverride) {
        return { ok: false as const, status: 400, message: "LATE_CHECKIN_NO_SHOW" };
      }
      if (reservation.status !== "APPROVED" && !(allowLateOverride && reservation.status === "NO_SHOW")) {
        return { ok: false as const, status: 400, message: "NOT_APPROVED" };
      }
      if (reservation.loan) {
        return { ok: false as const, status: 400, message: "ALREADY_CHECKED_IN" };
      }

      const now = new Date();
      const lateLimit = new Date(reservation.startAt.getTime() + 30 * 60 * 1000);
      if (now > lateLimit && !allowLateOverride) {
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
      if (!key) return { ok: false as const, status: 400, message: "NO_AVAILABLE_KEY" };

      await tx.loan.create({
        data: {
          reservationId: reservation.id,
          keyId: key.id,
          checkedInAt: new Date(),
          borrowerId,
          handledById,
        },
      });

      await tx.key.update({ where: { id: key.id }, data: { status: "BORROWED" } });
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: "CHECKED_IN" } });

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
