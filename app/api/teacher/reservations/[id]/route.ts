import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { generateRawToken , hashToken } from "@/lib/security/tokens";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

const raw = generateRawToken();
const tokenHash = hashToken(raw);


export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireRoleApi(["TEACHER"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

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

  const nextStatus = body.data.action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.reservation.update({
    where: { id },
    data: { status: nextStatus, approverId: auth.uid },
  });
  return NextResponse.json({ ok: true });
}
