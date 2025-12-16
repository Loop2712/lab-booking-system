import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const approverId = (session as any)?.uid as string | undefined;

  if (role !== "TEACHER" || !approverId) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = bodySchema.parse(await req.json());

  const found = await prisma.reservation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!found) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }

  if (found.status !== "PENDING") {
    return NextResponse.json(
      { ok: false, message: "ALREADY_DECIDED" },
      { status: 400 }
    );
  }

  const nextStatus = body.action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.reservation.update({
    where: { id },
    data: { status: nextStatus, approverId },
  });

  return NextResponse.json({ ok: true });
}
