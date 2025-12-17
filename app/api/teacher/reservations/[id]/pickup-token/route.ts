import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { generateRawToken, hashToken } from "@/lib/security/tokens";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const resv = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!resv) return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  if (resv.status !== "APPROVED") {
    return NextResponse.json({ ok: false, message: "NOT_APPROVED" }, { status: 400 });
  }

  const raw = generateRawToken();
  const tokenHash = hashToken(raw);

  // หมดอายุแนะนำ: 24 ชม.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // ถ้ามี token เดิมที่ยังไม่ใช้ → ปิดทิ้ง (กันมีหลายใบ)
  await prisma.accessToken.updateMany({
    where: {
      reservationId: id,
      type: "PICKUP",
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  await prisma.accessToken.create({
    data: {
      type: "PICKUP",
      tokenHash,
      expiresAt,
      reservationId: id,
    },
  });

  return NextResponse.json({ ok: true, pickupToken: raw, expiresAt: expiresAt.toISOString() });
}
