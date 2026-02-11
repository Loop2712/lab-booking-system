import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { generateInClassReservations } from "@/lib/inclass/generate";
import { addDaysYmd, isYmdBetweenInclusive, todayYmdBkk } from "@/lib/date/index";

export const runtime = "nodejs";

const MAX_RANGE_DAYS = 365;

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

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, MAX_RANGE_DAYS);
  if (
    !isYmdBetweenInclusive(body.from, minYmd, maxYmd) ||
    !isYmdBetweenInclusive(body.to, minYmd, maxYmd)
  ) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE", min: minYmd, max: maxYmd },
      { status: 400 }
    );
  }
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
