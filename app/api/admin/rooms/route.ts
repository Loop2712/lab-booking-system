import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

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
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const rooms = await prisma.room.findMany({
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    include: { _count: { select: { keys: true } } },
  });

  const roomIds = rooms.map((r) => r.id);

  const activeLoans = roomIds.length
    ? await prisma.loan.findMany({
        where: {
          checkedOutAt: null,
          key: { roomId: { in: roomIds } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          key: { select: { roomId: true } },
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true,
              role: true,
            },
          },
        },
      })
    : [];

  type Holder = {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string | null;
    role: string;
  } | null;

  const holderByRoom = new Map<string, Holder>();
  for (const loan of activeLoans) {
    const roomId = loan.key.roomId;
    if (!holderByRoom.has(roomId)) {
      holderByRoom.set(roomId, loan.borrower ?? null);
    }
  }

  const payload = rooms.map((room) => ({
    ...room,
    currentHolder: holderByRoom.get(room.id) ?? null,
  }));

  return NextResponse.json({ ok: true, rooms: payload });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const parsed = createRoomSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

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
