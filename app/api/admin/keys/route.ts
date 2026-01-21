import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const createKeySchema = z.object({
  keyCode: z.string().min(1),
  roomId: z.string().min(1),
  status: z.enum(["AVAILABLE", "BORROWED", "LOST", "DAMAGED"]).optional().default("AVAILABLE"),
});

export async function GET() {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const keys = await prisma.key.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { room: true },
  });

  return NextResponse.json({ ok: true, keys });
}

export async function POST(req: Request) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = createKeySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  try {
    const key = await prisma.key.create({ data: body.data });
    return NextResponse.json({ ok: true, key });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "CREATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
