import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/security/tokens";

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
          reservation: { select: { id: true, status: true, loan: { select: { id: true, keyId: true } } } },
        },
      });

      if (!t) return { ok: false as const, status: 404, message: "TOKEN_NOT_FOUND" };
      if (t.type !== "RETURN") return { ok: false as const, status: 400, message: "WRONG_TOKEN_TYPE" };
      if (t.usedAt) return { ok: false as const, status: 400, message: "TOKEN_ALREADY_USED" };
      if (t.expiresAt.getTime() < Date.now()) return { ok: false as const, status: 400, message: "TOKEN_EXPIRED" };

      if (t.reservation.status !== "CHECKED_IN") {
        return { ok: false as const, status: 400, message: "RESERVATION_NOT_CHECKED_IN" };
      }
      if (!t.reservation.loan) {
        return { ok: false as const, status: 400, message: "NO_LOAN" };
      }

      // mark return token used
      await tx.accessToken.update({ where: { id: t.id }, data: { usedAt: new Date() } });

      // close loan
      await tx.loan.update({
        where: { id: t.reservation.loan.id },
        data: { checkedInAt: new Date() } as any,
      });

      // key back to available
      await tx.key.update({
        where: { id: t.reservation.loan.keyId },
        data: { status: "AVAILABLE" },
      });

      // reservation completed
      await tx.reservation.update({
        where: { id: t.reservationId },
        data: { status: "COMPLETED" },
      });

      return { ok: true as const, status: 200 };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
