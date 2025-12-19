import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isAdmin(role?: string) {
  return role === "ADMIN";
}

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
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

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
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  const created = await prisma.section.create({
    data: {
      courseId: body.courseId,
      teacherId: body.teacherId,
      roomId: body.roomId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      term: body.term ?? null,
      year: body.year ?? null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
