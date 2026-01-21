import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const patchSchema = z.object({
  keyCode: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  status: z.enum(["AVAILABLE", "BORROWED", "LOST", "DAMAGED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  try {
    const key = await prisma.key.update({
      where: { id: params.id },
      data: body.data,
    });
    return NextResponse.json({ ok: true, key });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "UPDATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    await prisma.key.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "DELETE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
