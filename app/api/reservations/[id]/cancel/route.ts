import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const requesterId = (session as any)?.uid as string | undefined;
  const role = (session as any)?.role as string | undefined;

  if (!requesterId || role !== "STUDENT") {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const found = await prisma.reservation.findFirst({
    where: { id, requesterId },
    select: { id: true, status: true },
  });

  if (!found) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }

  if (found.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, message: "CANNOT_CANCEL_NON_PENDING" },
      { status: 400 }
    );
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
