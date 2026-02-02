import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { generateInClassReservations } from "@/lib/inclass/generate";
import { addDaysYmd, isYmdBetweenInclusive, todayYmdBkk } from "@/lib/date/index";

export const runtime = "nodejs";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // ✅ สำคัญมาก

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const body = bodySchema.parse(await req.json());
  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, 30);
  if (
    !isYmdBetweenInclusive(body.from, minYmd, maxYmd) ||
    !isYmdBetweenInclusive(body.to, minYmd, maxYmd)
  ) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE", min: minYmd, max: maxYmd },
      { status: 400 }
    );
  }

  const result = await generateInClassReservations({
    sectionId: id, // ✅ ใช้ id ที่ await แล้ว
    from: body.from,
    to: body.to,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
