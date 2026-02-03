import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import type { ReservationStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";
import { areConsecutiveSlots, findSlot } from "@/lib/reserve/slots";
import { todayYmdBkk, addDaysYmd, isYmdBetweenInclusive  } from "@/lib/date/index";
import type { DayName } from "@/lib/date/toDayName";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  date: z.string().min(8), // "YYYY-MM-DD"
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  slotId: z.string().min(1).optional(),
  slotIds: z.array(z.string().min(1)).optional(),
  note: z.string().optional().nullable(),
});

// helper แปลง slot → เวลา
function slotToTime(slot: string, date: string) {
  const [s, e] = slot.split("-");
  const startAt = new Date(`${date}T${s}:00+07:00`);
  const endAt = new Date(`${date}T${e}:00+07:00`);
  return { startAt, endAt };
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

const MIN_BOOK_MINUTES = 7 * 60;  // 07:00
const MAX_BOOK_MINUTES = 21 * 60; // 21:00

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((n) => Number(n));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
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
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && aE > bS;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role;
  const uid = (session as any)?.uid || (session as any)?.user?.id;

  if (!uid || !role) {
    return NextResponse.json(
      { ok: false, message: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) {
    return NextResponse.json(
      { ok: false, message: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { roomId, date, slotId, slotIds, note } = parsed.data;
  const { startTime, endTime } = parsed.data;
  const useCustomTime = !!startTime && !!endTime;
  const selectedSlots = Array.from(
    new Set([...(slotIds ?? []), ...(slotId ? [slotId] : [])])
  );

  if (!useCustomTime && selectedSlots.length === 0) {
    return NextResponse.json(
      { ok: false, message: "INVALID_SLOT" },
      { status: 400 }
    );
  }

  if (!useCustomTime && selectedSlots.length > 2) {
    return NextResponse.json(
      { ok: false, message: "TOO_MANY_SLOTS" },
      { status: 400 }
    );
  }

  if ((startTime && !endTime) || (!startTime && endTime)) {
    return NextResponse.json(
      { ok: false, message: "INVALID_TIME_FORMAT" },
      { status: 400 }
    );
  }

  if (useCustomTime) {
    const start = startTime as string;
    const end = endTime as string;
    if (!isValidTime(start) || !isValidTime(end)) {
      return NextResponse.json(
        { ok: false, message: "INVALID_TIME_FORMAT" },
        { status: 400 }
      );
    }
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    if (endMin <= startMin) {
      return NextResponse.json(
        { ok: false, message: "INVALID_TIME_RANGE" },
        { status: 400 }
      );
    }
    if (startMin < MIN_BOOK_MINUTES || endMin > MAX_BOOK_MINUTES) {
      return NextResponse.json(
        { ok: false, message: "TIME_OUT_OF_RANGE" },
        { status: 400 }
      );
    }
  } else {
    // ✅ validate slot (UI expects INVALID_SLOT)
    const hasInvalidSlot = selectedSlots.some((id) => !findSlot(id));
    if (hasInvalidSlot) {
      return NextResponse.json(
        { ok: false, message: "INVALID_SLOT" },
        { status: 400 }
      );
    }

    if (!areConsecutiveSlots(selectedSlots)) {
      return NextResponse.json(
        { ok: false, message: "SLOT_NOT_CONSECUTIVE" },
        { status: 400 }
      );
    }
  }

  // ✅ validate date range: วันนี้ .. วันนี้+30 (inclusive) (UI expects DATE_OUT_OF_RANGE)
  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, 30);
  if (!isYmdBetweenInclusive(date, minYmd, maxYmd)) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE" },
      { status: 400 }
    );
  }

  // เช็คชนตารางเรียนของห้อง (section ที่ยังไม่ถูก generate ก็ต้องกันไว้)
  const dayName = bkkDayName(date);
  const sections = await prisma.section.findMany({
    where: { roomId, dayOfWeek: dayName, isActive: true },
    select: { startTime: true, endTime: true },
  });
  if (sections.length > 0) {
    const slotRanges = useCustomTime
      ? [{ start: startTime as string, end: endTime as string }]
      : selectedSlots
          .map((id) => findSlot(id))
          .filter((s): s is NonNullable<typeof s> => !!s)
          .map((s) => ({ start: s.start, end: s.end }));

    const conflict = sections.some((section) =>
      slotRanges.some((slot) =>
        rangesOverlap(slot.start, slot.end, section.startTime, section.endTime)
      )
    );

    if (conflict) {
      return NextResponse.json(
        { ok: false, message: "CONFLICT_WITH_CLASS_SCHEDULE" },
        { status: 409 }
      );
    }
  }

  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";
  const status: ReservationStatus = isTeacher || isAdmin ? "APPROVED" : "PENDING";

  try {
    const dateOnly = new Date(`${date}T00:00:00+07:00`);
    const result = await prisma.$transaction(async (tx) => {
      const ranges = useCustomTime
        ? (() => {
            const start = startTime as string;
            const end = endTime as string;
            const slot = `${start}-${end}`;
            return [{ slot, ...slotToTime(slot, date) }];
          })()
        : selectedSlots.map((slot) => ({
            slot,
            ...slotToTime(slot, date),
          }));

      const conflict = await tx.reservation.findFirst({
        where: {
          roomId,
          OR: ranges.map((r) => ({
            startAt: { lt: r.endAt },
            endAt: { gt: r.startAt },
          })),
        },
        select: { id: true },
      });
      if (conflict) return { ok: false as const, status: 409, message: "ROOM_ALREADY_RESERVED" };

      const data = ranges.map((r) => ({
        type: "AD_HOC" as const,
        status,
        approverId: isTeacher || isAdmin ? uid : null,
        requesterId: uid,
        roomId,
        date: dateOnly,
        slot: r.slot,
        startAt: r.startAt,
        endAt: r.endAt,
        note: note ?? null,
      }));

      await tx.reservation.createMany({ data });
      return { ok: true as const, status: 200, count: data.length };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, count: result.count });
  } catch (e: any) {
    // ✅ unique collision -> UI expects ROOM_ALREADY_RESERVED
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { ok: false, message: "ROOM_ALREADY_RESERVED" },
        { status: 409 }
      );
    }

    console.error("[RESERVATION_CREATE_ERROR]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
