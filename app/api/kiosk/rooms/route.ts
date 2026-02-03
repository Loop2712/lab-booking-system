import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireScannerKey } from "../_util";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireScannerKey(req);
  if (!gate.ok) return gate.res;

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return NextResponse.json({ ok: true, rooms });
}
