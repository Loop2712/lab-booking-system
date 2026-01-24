import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isAdmin(role?: string) {
  return role === "ADMIN";
}

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const roomId = url.searchParams.get("roomId") || "ALL";
  const type = url.searchParams.get("type") || "ALL";
  const status = url.searchParams.get("status") || "ALL";

  if (!from || !to) return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });

  const where: any = {
    date: { gte: startOfDayUTC(from), lte: startOfDayUTC(to) },
  };
  if (roomId !== "ALL") where.roomId = roomId;
  if (type !== "ALL") where.type = type;
  if (status !== "ALL") where.status = status;

  const total = await prisma.reservation.count({ where });

  const byRoom = await prisma.reservation.groupBy({
    by: ["roomId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { roomId: "desc" } },
  });

  const roomMap = await prisma.room.findMany({
    where: { id: { in: byRoom.map((x) => x.roomId).filter(Boolean) } },
    select: { id: true, code: true, name: true },
  });

  const roomLabel = new Map(roomMap.map((r) => [r.id, `${r.code} — ${r.name}`]));

  const byType = await prisma.reservation.groupBy({
    by: ["type"],
    where,
    _count: { _all: true },
  });

  const byStatus = await prisma.reservation.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const topRequesters = await prisma.reservation.groupBy({
    by: ["requesterId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { requesterId: "desc" } },
    take: 10,
  });

  const requesterUsers = await prisma.user.findMany({
    where: { id: { in: topRequesters.map((x) => x.requesterId).filter(Boolean) } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  const requesterLabel = new Map(
    requesterUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}${u.email ? ` (${u.email})` : ""}`])
  );

  return NextResponse.json({
    ok: true,
    total,
    byRoom: byRoom.map((x) => ({
      roomId: x.roomId,
      room: roomLabel.get(x.roomId) ?? x.roomId,
      count: x._count._all,
    })),
    byType: byType.map((x) => ({ type: x.type, count: x._count._all })),
    byStatus: byStatus.map((x) => ({ status: x.status, count: x._count._all })),
    topRequesters: topRequesters.map((x) => ({
      requesterId: x.requesterId,
      requester: requesterLabel.get(x.requesterId) ?? x.requesterId,
      count: x._count._all,
    })),
  });
}
