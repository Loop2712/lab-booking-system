import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const createSchema = z.object({
  courseId: z.string().min(1),
  teacherId: z.string().min(1),
  roomId: z.string().min(1),
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  term: z.string().optional(),
  year: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const items = await prisma.section.findMany({
    orderBy: [{ year: "desc" }, { term: "desc" }, { createdAt: "desc" }],
    include: {
      course: true,
      room: true,
      teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { enrollments: true, reservations: true } },
    },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const created = await prisma.section.create({
    data: {
      courseId: body.data.courseId,
      teacherId: body.data.teacherId,
      roomId: body.data.roomId,
      dayOfWeek: body.data.dayOfWeek,
      startTime: body.data.startTime,
      endTime: body.data.endTime,
      term: body.data.term ?? null,
      year: body.data.year ?? null,
      isActive: body.data.isActive ?? true,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
