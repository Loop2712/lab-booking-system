import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { startOfBangkokDay } from "@/lib/date/bangkok";

export const runtime = "nodejs";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const updateSchema = z.object({
  term: z.string().min(1).optional(),
  year: z.number().int().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  isActive: z.boolean().optional(),
});

function endOfBangkokDay(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

function toBangkokYmd(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const parsed = updateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "BAD_BODY", detail: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    if (body.term && !body.term.trim()) {
      return NextResponse.json(
        { ok: false, message: "TERM_REQUIRED" },
        { status: 400 }
      );
    }
    if (body.startDate || body.endDate) {
      const current = await prisma.term.findUnique({
        where: { id },
        select: { startDate: true, endDate: true },
      });
      if (!current) {
        return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
      }
      const currentStart = toBangkokYmd(current.startDate);
      const currentEnd = toBangkokYmd(current.endDate);
      const startCheck = body.startDate ?? currentStart;
      const endCheck = body.endDate ?? currentEnd;
      if (endCheck < startCheck) {
        return NextResponse.json(
          { ok: false, message: "END_DATE_BEFORE_START_DATE" },
          { status: 400 }
        );
      }
    }

    const data: any = {};
    if (body.term) data.term = body.term.trim();
    if (typeof body.year === "number") data.year = body.year;
    if (body.startDate) data.startDate = startOfBangkokDay(body.startDate);
    if (body.endDate) data.endDate = endOfBangkokDay(body.endDate);
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.term.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    const prismaCode = e?.code || e?.name || null;
    if (prismaCode === "P2002") {
      return NextResponse.json(
        { ok: false, message: "TERM_YEAR_DUPLICATE" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error", prismaCode },
      { status: 500 }
    );
  }
}
