import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateRawToken, hashToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json());
  const tokenHash = hashToken(body.token);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const t = await tx.accessToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          type: true,
          expiresAt: true,
          usedAt: true,
          reservationId: true,
          reservation: { select: { id: true, status: true, roomId: true, slot: true, startAt: true, endAt: true } },
        },
      });

      if (!t) return { ok: false as const, status: 404, message: "TOKEN_NOT_FOUND" };
      if (t.type !== "PICKUP") return { ok: false as const, status: 400, message: "WRONG_TOKEN_TYPE" };
      if (t.usedAt) return { ok: false as const, status: 400, message: "TOKEN_ALREADY_USED" };
      if (t.expiresAt.getTime() < Date.now()) return { ok: false as const, status: 400, message: "TOKEN_EXPIRED" };

      if (t.reservation.status !== "APPROVED") {
        return { ok: false as const, status: 400, message: "RESERVATION_NOT_APPROVED" };
      }

      const key = await tx.key.findFirst({
        where: { roomId: t.reservation.roomId, status: "AVAILABLE" },
        select: { id: true },
      });
      if (!key) return { ok: false as const, status: 400, message: "NO_AVAILABLE_KEY" };

      // mark pickup token used
      await tx.accessToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });

      // create loan + update key/reservation
      await tx.loan.create({
        data: {
          reservationId: t.reservationId,
          keyId: key.id,
          checkedOutAt: new Date(),
          // handledById: null (ถ้าฟิลด์นี้ required ให้ทำ optional หรือใช้ SYSTEM user id)
        } as any,
      });

      await tx.key.update({ where: { id: key.id }, data: { status: "BORROWED" } });
      await tx.reservation.update({ where: { id: t.reservationId }, data: { status: "CHECKED_IN" } });

      // ✅ สร้าง RETURN token (ใช้ครั้งเดียว)
      const rawReturn = generateRawToken();
      const returnHash = hashToken(rawReturn);
      const returnExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await tx.accessToken.create({
        data: {
          type: "RETURN",
          tokenHash: returnHash,
          expiresAt: returnExpiresAt,
          reservationId: t.reservationId,
        },
      });

      return {
        ok: true as const,
        status: 200,
        returnToken: rawReturn,
        returnExpiresAt: returnExpiresAt.toISOString(),
      };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      returnToken: result.returnToken,
      returnExpiresAt: result.returnExpiresAt,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
