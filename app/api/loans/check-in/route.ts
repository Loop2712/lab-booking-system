import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  reservationId: z.string().min(1),
});

function canUse(role?: string) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const staffId = (session as any)?.uid as string | undefined;

  if (!canUse(role) || !staffId) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = bodySchema.parse(await req.json());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resv = await tx.reservation.findUnique({
        where: { id: body.reservationId },
        select: {
          id: true,
          status: true,
          roomId: true,
          loan: { select: { id: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
      if (resv.status !== "APPROVED") return { ok: false as const, status: 400, message: "NOT_APPROVED" };
      if (resv.loan) return { ok: false as const, status: 400, message: "ALREADY_CHECKED_IN" };

      // ✅ หา key ที่ AVAILABLE ของห้องนี้
      const key = await tx.key.findFirst({
        where: { roomId: resv.roomId, status: "AVAILABLE" },
        select: { id: true },
      });

      if (!key) return { ok: false as const, status: 400, message: "NO_AVAILABLE_KEY" };

      // ✅ สร้าง Loan + ผูก key
      await tx.loan.create({
        data: {
          reservationId: resv.id,
          keyId: key.id,
          checkedOutAt: new Date(),   // ให้กุญแจออกไป
          handledById: staffId,
        },
      });

      // ✅ update key + reservation
      await tx.key.update({
        where: { id: key.id },
        data: { status: "BORROWED" },
      });

      await tx.reservation.update({
        where: { id: resv.id },
        data: { status: "CHECKED_IN" },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("CHECKIN_ERROR:", e);
    return NextResponse.json(
      { ok: false, message: "ERROR", prismaCode: e?.code, detail: e?.message },
      { status: 500 }
    );
  }
}
