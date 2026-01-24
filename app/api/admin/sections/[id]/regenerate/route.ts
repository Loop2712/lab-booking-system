import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { generateInClassReservations } from "@/lib/inclass/generate";

export const runtime = "nodejs";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // ✅ สำคัญมาก

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const body = bodySchema.parse(await req.json());
  const fromDate = startOfDayUTC(body.from);
  const toDate = startOfDayUTC(body.to);

  const deleted = await prisma.reservation.deleteMany({
    where: {
      sectionId: id,
      type: "IN_CLASS",
      date: { gte: fromDate, lte: toDate },
      loan: { is: null },
      status: { notIn: ["CHECKED_IN", "COMPLETED"] },
    },
  });

  const gen = await generateInClassReservations({ sectionId: id, from: body.from, to: body.to });
  if (!gen.ok) return NextResponse.json(gen, { status: 400 });

  return NextResponse.json({ ok: true, deleted: deleted.count, created: gen.created });
}
