import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { addDaysYmd, isYmdBetweenInclusive, todayYmdBkk } from "@/lib/date/index";

export const runtime = "nodejs";

const MAX_RANGE_DAYS = 365;

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });
  }

  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, MAX_RANGE_DAYS);
  if (!isYmdBetweenInclusive(from, minYmd, maxYmd) || !isYmdBetweenInclusive(to, minYmd, maxYmd)) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE", min: minYmd, max: maxYmd },
      { status: 400 }
    );
  }

  const fromDate = startOfDayUTC(from);
  const toDate = startOfDayUTC(to);

  const deleted = await prisma.reservation.deleteMany({
    where: {
      sectionId: id,
      type: "IN_CLASS",
      date: { gte: fromDate, lte: toDate },
      loan: { is: null },
      status: { notIn: ["CHECKED_IN", "COMPLETED"] },
    },
  });

  return NextResponse.json({ ok: true, deleted: deleted.count });
}
