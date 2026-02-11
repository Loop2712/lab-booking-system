import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { TIME_SLOTS } from "@/lib/reserve/slots";
import { addDays } from "@/lib/date/addDays";
import { todayYmdBkk, addDaysYmd, isYmdBetweenInclusive } from "@/lib/date";
import { startOfBangkokDay } from "@/lib/date/bangkok";
import type { DayName } from "@/lib/date/toDayName";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

function isYmd(value: string | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function bkkDayName(ymd: string): DayName {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
  }).format(d);
  const map: Record<string, DayName> = {
    Sun: "SUN",
    Mon: "MON",
    Tue: "TUE",
    Wed: "WED",
    Thu: "THU",
    Fri: "FRI",
    Sat: "SAT",
  };
  return map[weekday] ?? "MON";
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const toMin = (value: string) => {
    const [h, m] = value.split(":").map((n) => Number(n));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const aS = toMin(aStart);
  const aE = toMin(aEnd);
  const bS = toMin(bStart);
  const bE = toMin(bEnd);
  return aS < bE && aE > bS;
}

function timeBkk(dt: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");
  const date = url.searchParams.get("date");

  if (!roomId || !isYmd(date)) {
    return NextResponse.json({ ok: false, message: "INVALID_QUERY" }, { status: 400 });
  }

  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, 30);
  if (!isYmdBetweenInclusive(date, minYmd, maxYmd)) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE", min: minYmd, max: maxYmd },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, code: true, name: true, roomNumber: true, floor: true, isActive: true },
  });
  if (!room || !room.isActive) {
    return NextResponse.json({ ok: false, message: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const dayStart = startOfBangkokDay(date);
  const dayEnd = addDays(dayStart, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      roomId,
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      NOT: [{ status: "CANCELLED" }, { status: "REJECTED" }],
    },
    select: { startAt: true, endAt: true },
  });

  const sections = await prisma.section.findMany({
    where: {
      roomId,
      isActive: true,
      dayOfWeek: bkkDayName(date),
      term: {
        isActive: true,
        startDate: { lte: dayStart },
        endDate: { gte: dayStart },
      },
    },
    select: { startTime: true, endTime: true },
  });

  const slots = TIME_SLOTS.map((slot) => {
    const reserved = reservations.some((r) =>
      rangesOverlap(slot.start, slot.end, timeBkk(r.startAt), timeBkk(r.endAt))
    );

    const conflictWithClass = sections.some((s) => rangesOverlap(slot.start, slot.end, s.startTime, s.endTime));

    let reason: string | null = null;
    if (reserved) reason = "ROOM_ALREADY_RESERVED";
    else if (conflictWithClass) reason = "CONFLICT_WITH_CLASS_SCHEDULE";

    return {
      id: slot.id,
      label: slot.label,
      start: slot.start,
      end: slot.end,
      available: !reason,
      reason,
    };
  });

  return NextResponse.json({
    ok: true,
    room,
    date,
    slots,
    limits: { maxSlots: 2, mustConsecutive: true },
  });
}
