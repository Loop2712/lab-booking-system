import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role;

    if (!session || !role) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
      return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
    }

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
