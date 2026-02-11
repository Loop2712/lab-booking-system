import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"]);
    if (!guard.ok) return guard.response;

    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        computerCount: true,
      },
    });

    return NextResponse.json({ ok: true, rooms });
  } catch (e: any) {
    console.error("[API_ROOMS_ERROR]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
