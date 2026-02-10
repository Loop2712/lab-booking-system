import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  term: z.string().min(1),
  year: z.number().int(),
  startDate: dateSchema,
  endDate: dateSchema,
  isActive: z.boolean().optional(),
});

function startOfBangkokDay(ymd: string) {
  return new Date(`${ymd}T00:00:00.000+07:00`);
}

function endOfBangkokDay(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "1";

  const now = new Date();
  await prisma.term.updateMany({
    where: { isActive: true, endDate: { lt: now } },
    data: { isActive: false },
  });

  const items = await prisma.term.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ year: "desc" }, { term: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    const body = createSchema.parse(await req.json());
    const termText = body.term.trim();
    if (!termText) {
      return NextResponse.json(
        { ok: false, message: "TERM_REQUIRED" },
        { status: 400 }
      );
    }
    if (body.endDate < body.startDate) {
      return NextResponse.json(
        { ok: false, message: "END_DATE_BEFORE_START_DATE" },
        { status: 400 }
      );
    }

    const created = await prisma.term.create({
      data: {
        term: termText,
        year: body.year,
        startDate: startOfBangkokDay(body.startDate),
        endDate: endOfBangkokDay(body.endDate),
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ ok: true, item: created });
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
