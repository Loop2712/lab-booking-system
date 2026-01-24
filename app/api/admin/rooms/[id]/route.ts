import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

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
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const room = await prisma.room.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, room });
} 


export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "DELETE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
