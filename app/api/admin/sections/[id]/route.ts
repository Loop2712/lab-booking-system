import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const patchSchema = z.object({
  courseId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  term: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.section.update({
    where: { id: ctx.params.id },
    data: body.data,
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  await prisma.section.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}
