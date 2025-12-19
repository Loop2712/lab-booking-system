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
  code: z.string().min(2),
  name: z.string().min(2),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const items = await prisma.course.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const created = await prisma.course.create({ data: body });

  return NextResponse.json({ ok: true, item: created });
}
