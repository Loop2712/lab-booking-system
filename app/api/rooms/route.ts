import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireRoleApi(["STUDENT", "TEACHER", "ADMIN"]);
    if (!auth.ok) return auth.response;

    const rooms = await prisma.room.findMany({
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
