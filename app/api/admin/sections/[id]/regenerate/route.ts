import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { generateInClassReservations } from "@/lib/inclass/generate";
import { requireRoleApi } from "@/lib/auth/guard";
import { startOfDayUTC } from "@/lib/datetime";

export const runtime = "nodejs";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // ✅ สำคัญมาก

  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const fromDate = startOfDayUTC(body.data.from);
  const toDate = startOfDayUTC(body.data.to);

  const deleted = await prisma.reservation.deleteMany({
    where: {
      sectionId: id,
      type: "IN_CLASS",
      date: { gte: fromDate, lte: toDate },
      loan: { is: null },
      status: { notIn: ["CHECKED_IN", "COMPLETED"] },
    },
  });

  const gen = await generateInClassReservations({ sectionId: id, from: body.data.from, to: body.data.to });
  if (!gen.ok) return NextResponse.json(gen, { status: 400 });

  return NextResponse.json({ ok: true, deleted: deleted.count, created: gen.created });
}
