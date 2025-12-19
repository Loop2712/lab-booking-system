import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isAdmin(role?: string) {
  return role === "ADMIN";
}

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
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const body = patchSchema.parse(await req.json());

  const updated = await prisma.section.update({
    where: { id: ctx.params.id },
    data: body as any,
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  await prisma.section.delete({ where: { id: ctx.params.id } });
  return NextResponse.json({ ok: true });
}
