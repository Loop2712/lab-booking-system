import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const createSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
});

export async function GET() {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const items = await prisma.course.findMany({
    orderBy: { code: "asc" },
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
  const created = await prisma.course.create({ data: body.data });

  return NextResponse.json({ ok: true, item: created });
}
