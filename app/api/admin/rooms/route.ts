import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  floor: z.coerce.number().int().min(0),
  computerCount: z.coerce.number().int().min(0),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function GET() {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const rooms = await prisma.room.findMany({
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    include: { _count: { select: { keys: true } } },
  });

  return NextResponse.json({ ok: true, rooms });
}

export async function POST(req: Request) {
  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = createRoomSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  try {
    const room = await prisma.room.create({ data: body.data });
    return NextResponse.json({ ok: true, room });
  } catch (e: any) {
    // unique constraint เช่น code หรือ (roomNumber,floor)
    return NextResponse.json(
      { ok: false, message: "CREATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
