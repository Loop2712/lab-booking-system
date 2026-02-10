import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { addDays } from "@/lib/date/addDays";
import { getBangkokYMD, startOfBangkokDay } from "@/lib/date/bangkok";

function bkkDayName(ymd: string) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
  }).format(d);
  const map: Record<string, "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"> = {
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

function normalizeTime(value: string) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function buildBangkokDateTime(ymd: string, time: string) {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  return new Date(`${ymd}T${normalized}:00+07:00`);
}

function addDaysYmd(ymd: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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
        sectionId: true,
        date: true,
        requester: { select: { firstName: true, lastName: true, role: true } },
        section: { select: { course: { select: { code: true, name: true } } } },
        loan: { select: { borrower: { select: { firstName: true, lastName: true } } } },
      },
    });

    const inClassReservationKeys = new Set(
      reservations
        .filter((r) => r.type === "IN_CLASS" && r.sectionId)
        .map((r) => `${r.sectionId}::${getBangkokYMD(r.date)}`)
    );

    const sections = await prisma.section.findMany({
      where: {
        roomId,
        isActive: true,
        term: {
          isActive: true,
          startDate: { lte: endExclusive },
          endDate: { gte: fromStart },
        },
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        term: { select: { startDate: true, endDate: true } },
        course: { select: { code: true, name: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    const dayList: string[] = [];
    for (let cur = from; ; cur = addDaysYmd(cur, 1)) {
      dayList.push(cur);
      if (cur === to) break;
      if (dayList.length > 120) {
        return NextResponse.json(
          { ok: false, message: "ช่วงวันที่ยาวเกินไป (จำกัด 120 วัน)" },
          { status: 400 }
        );
      }
    }

    const items = reservations.map((r) => ({
      reservationId: r.id,
      type: r.type,
      status: r.status,
      slot: r.slot,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      requesterLabel: isAuthed ? `${r.requester.firstName} ${r.requester.lastName} (${r.requester.role})` : null,
      borrowerLabel: isAuthed && r.loan?.borrower ? `${r.loan.borrower.firstName} ${r.loan.borrower.lastName}` : null,
      courseLabel: r.section?.course ? `${r.section.course.code} ${r.section.course.name}` : null,
    }));

    for (const ymd of dayList) {
      const dayName = bkkDayName(ymd);
      const dayStart = startOfBangkokDay(ymd);

      for (const s of sections) {
        if (s.dayOfWeek !== dayName) continue;
        if (s.term.startDate > dayStart || s.term.endDate < dayStart) continue;
        if (inClassReservationKeys.has(`${s.id}::${ymd}`)) continue;

        const startAt = buildBangkokDateTime(ymd, s.startTime);
        const endAt = buildBangkokDateTime(ymd, s.endTime);
        if (!startAt || !endAt) continue;

        const startLabel = normalizeTime(s.startTime);
        const endLabel = normalizeTime(s.endTime);
        if (!startLabel || !endLabel) continue;

        items.push({
          reservationId: `section-${s.id}-${ymd}`,
          type: "IN_CLASS",
          status: "APPROVED",
          slot: `${startLabel}-${endLabel}`,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        requesterLabel: isAuthed ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
        borrowerLabel: isAuthed ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
        courseLabel: `${s.course.code} ${s.course.name}`,
      });
      }
    }

    items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

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
