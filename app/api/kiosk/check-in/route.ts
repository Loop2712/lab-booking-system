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

  // 1) Verify QR token
  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json(
      { ok: false, message: "BAD_QR_TOKEN", reason: vt.reason },
      { status: 400 }
    );
  }

  const borrowerId = vt.uid;

  // ✅ 2) Role guard: allow only STUDENT / TEACHER (รับ TEACHER ตามที่ขอ)
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
      if (resv.status !== "APPROVED")
        return { ok: false as const, status: 400, message: "INVALID_STATUS" };
      if (resv.loan?.id) return { ok: false as const, status: 400, message: "ALREADY_HAS_LOAN" };

      // 3) Ownership/permission check (เหมือนเดิม)
      // - Student: ต้องเป็น requester หรือ participant
      // - Teacher: ก็ใช้ rule เดียวกัน (ซึ่งครูจะเป็น requester ได้ทั้ง IN_CLASS และ AD_HOC)
      const okOwner =
        resv.requesterId === borrowerId || resv.participants.some((p) => p.userId === borrowerId);

      if (!okOwner) return { ok: false as const, status: 403, message: "NOT_OWNER" };

      const key = await tx.key.findFirst({
        where: { roomId: resv.roomId, status: "AVAILABLE" },
        select: { id: true },
      });

      if (!key) return { ok: false as const, status: 409, message: "NO_AVAILABLE_KEY" };

      // 4) Create Loan + update key/reservation
      await tx.loan.create({
        data: {
          reservationId: resv.id,
          keyId: key.id,
          checkedInAt: new Date(), // (ตามของเดิมในโปรเจค)
          borrowerId,
        },
      });

      await tx.key.update({ where: { id: key.id }, data: { status: "BORROWED" } });
      await tx.reservation.update({ where: { id: resv.id }, data: { status: "CHECKED_IN" } });

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
