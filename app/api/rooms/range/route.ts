import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { addDays } from "@/lib/date/addDays";
import { startOfBangkokDay } from "@/lib/date/bangkok";

export const runtime = "nodejs";

function isYmd(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role as string | undefined;
    const isAuthed = !!session && !!role;

    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId") || "";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!roomId || !isYmd(from) || !isYmd(to)) {
      return NextResponse.json(
        { ok: false, message: "INVALID_QUERY" },
        { status: 400 }
      );
    }

    const fromStart = startOfBangkokDay(from);
    const toStart = startOfBangkokDay(to);
    if (toStart < fromStart) {
      return NextResponse.json(
        { ok: false, message: "INVALID_RANGE" },
        { status: 400 }
      );
    }

    const endExclusive = addDays(toStart, 1);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, code: true, name: true, roomNumber: true, floor: true, isActive: true },
    });
    if (!room || !room.isActive) {
      return NextResponse.json({ ok: false, message: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId,
        startAt: { lt: endExclusive },
        endAt: { gt: fromStart },
        NOT: [{ status: "CANCELLED" }, { status: "REJECTED" }],
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        type: true,
        status: true,
        slot: true,
        startAt: true,
        endAt: true,
        requester: { select: { firstName: true, lastName: true, role: true } },
        section: { select: { course: { select: { code: true, name: true } } } },
        loan: { select: { borrower: { select: { firstName: true, lastName: true } } } },
      },
    });

    const items = reservations.map((r) => ({
      reservationId: r.id,
      type: r.type,
      status: r.status,
      slot: r.slot,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      requesterLabel: isAuthed ? `${r.requester.firstName} ${r.requester.lastName} (${r.requester.role})` : null,
      borrowerLabel: isAuthed && r.loan?.borrower ? `${r.loan.borrower.firstName} ${r.loan.borrower.lastName}` : null,
      courseLabel: isAuthed && r.section?.course ? `${r.section.course.code} ${r.section.course.name}` : null,
    }));

    return NextResponse.json({
      ok: true,
      room,
      from,
      to,
      items,
    });
  } catch (e: any) {
    console.error("[API_ROOMS_RANGE_ERROR]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
