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
          loan: { select: { id: true, keyId: true } },
        },
      });

      if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
      if (resv.status !== "CHECKED_IN") return { ok: false as const, status: 400, message: "NOT_CHECKED_IN" };
      if (!resv.loan) return { ok: false as const, status: 400, message: "NO_LOAN" };

      // ✅ ปิด Loan (รับกุญแจกลับ)
      await tx.loan.update({
        where: { id: resv.loan.id },
        data: {
          checkedInAt: new Date(),
          handledById: staffId,
        },
      });

      // ✅ คืนสถานะ key
      await tx.key.update({
        where: { id: resv.loan.keyId },
        data: { status: "AVAILABLE" },
      });

      // ✅ ปิด reservation
      await tx.reservation.update({
        where: { id: resv.id },
        data: { status: "COMPLETED" },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("RETURN_ERROR:", e);
    return NextResponse.json(
      { ok: false, message: "ERROR", prismaCode: e?.code, detail: e?.message },
      { status: 500 }
    );
  }
}
