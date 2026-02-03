import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
function toMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((n) => Number(n));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

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
    if (!isValidTime(body.startTime) || !isValidTime(body.endTime)) {
      return NextResponse.json(
        { ok: false, message: "INVALID_TIME_FORMAT" },
        { status: 400 }
      );
    }
    if (toMinutes(body.endTime) <= toMinutes(body.startTime)) {
      return NextResponse.json(
        { ok: false, message: "INVALID_TIME_RANGE" },
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
