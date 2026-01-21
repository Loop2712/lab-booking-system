import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const patchSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  floor: z.coerce.number().int().min(0).optional(),
  computerCount: z.coerce.number().int().min(0).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: parsed.error.flatten() }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, room });
} 


export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    await prisma.room.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "DELETE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
