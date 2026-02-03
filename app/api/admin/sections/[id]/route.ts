import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { findSlot } from "@/lib/reserve/slots";

export const runtime = "nodejs";

const updateSchema = z.object({
  courseId: z.string().min(1),
  teacherId: z.string().min(1),
  roomId: z.string().min(1),
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  term: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const body = updateSchema.parse(await req.json());
    const slotId = `${body.startTime}-${body.endTime}`;
    if (!findSlot(slotId)) {
      return NextResponse.json(
        { ok: false, message: "INVALID_TIME_SLOT" },
        { status: 400 }
      );
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        courseId: body.courseId,
        teacherId: body.teacherId,
        roomId: body.roomId,
        dayOfWeek: body.dayOfWeek,
        startTime: body.startTime,
        endTime: body.endTime,
        term: body.term ?? null,
        year: body.year ?? null,
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
