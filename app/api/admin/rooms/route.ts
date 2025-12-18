import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function assertAdmin(session: any) {
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

const createRoomSchema = z.object({
  roomNumber: z.string().min(1),
  floor: z.coerce.number().int().min(0),
  computerCount: z.coerce.number().int().min(0),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  const rooms = await prisma.room.findMany({
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    include: { _count: { select: { keys: true } } },
  });

  return NextResponse.json({ ok: true, rooms });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  const body = createRoomSchema.parse(await req.json());

  try {
    const room = await prisma.room.create({ data: body });
    return NextResponse.json({ ok: true, room });
  } catch (e: any) {
    // unique constraint เช่น code หรือ (roomNumber,floor)
    return NextResponse.json(
      { ok: false, message: "CREATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
