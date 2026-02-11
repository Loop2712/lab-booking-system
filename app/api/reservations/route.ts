import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import type { ReservationStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";
import { areConsecutiveSlots, findSlot } from "@/lib/reserve/slots";
import { todayYmdBkk, addDaysYmd, isYmdBetweenInclusive  } from "@/lib/date/index";
import { startOfBangkokDay } from "@/lib/date/bangkok";
import { bkkDayName } from "@/lib/date/bkkDayName";
import { rangesOverlapByTimeText, timeToMinutesOrZero } from "@/lib/date/time";
import { getReservationStatusInfo } from "@/lib/reservations/status";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  date: z.string().min(8), // "YYYY-MM-DD"
  startTime: z.string().min(1).optional(),
  endTime: z.string().min(1).optional(),
  slotId: z.string().min(1).optional(),
  slotIds: z.array(z.string().min(1)).optional(),
  approverId: z.string().min(1).optional(),
  participantIds: z.array(z.string().min(1)).optional(),
  note: z.string().optional().nullable(),
});

// helper แปลง slot → เวลา
function slotToTime(slot: string, date: string) {
  const [s, e] = slot.split("-");
  const startAt = new Date(`${date}T${s}:00+07:00`);
  const endAt = new Date(`${date}T${e}:00+07:00`);
  return { startAt, endAt };
}

const MIN_BOOK_MINUTES = 7 * 60;  // 07:00
const MAX_BOOK_MINUTES = 21 * 60; // 21:00

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((n) => Number(n));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["STUDENT", "TEACHER", "ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const role = guard.role;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { roomId, date, slotId, slotIds, approverId, note, participantIds } = parsed.data;
  const { startTime, endTime } = parsed.data;
  const useCustomTime = !!startTime && !!endTime;
  const selectedSlots = Array.from(
    new Set([...(slotIds ?? []), ...(slotId ? [slotId] : [])])
  );
  const uniqueParticipants = Array.from(new Set(participantIds ?? []))
    .filter((pid) => pid !== uid);

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
    const startMin = timeToMinutesOrZero(start);
    const endMin = timeToMinutesOrZero(end);
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

  if (uniqueParticipants.length > 4) {
    return NextResponse.json(
      { ok: false, message: "PARTICIPANT_LIMIT_EXCEEDED" },
      { status: 400 }
    );
  }

  if (uniqueParticipants.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueParticipants }, role: "STUDENT", isActive: true },
      select: { id: true },
    });

    if (users.length !== uniqueParticipants.length) {
      return NextResponse.json(
        { ok: false, message: "INVALID_PARTICIPANTS" },
        { status: 400 }
      );
    }
  }

  let reservationApproverId: string | null = null;
  if (role === "STUDENT") {
    if (!approverId) {
      return NextResponse.json(
        { ok: false, message: "APPROVER_REQUIRED" },
        { status: 400 }
      );
    }

    const approverUser = await prisma.user.findFirst({
      where: { id: approverId, role: "TEACHER", isActive: true },
      select: { id: true },
    });
    if (!approverUser) {
      return NextResponse.json(
        { ok: false, message: "INVALID_APPROVER" },
        { status: 400 }
      );
    }

    reservationApproverId = approverUser.id;
  } else {
    reservationApproverId = uid;
  }

  // เช็คชนตารางเรียนของห้อง (section ที่ยังไม่ถูก generate ก็ต้องกันไว้)
  const dayName = bkkDayName(date);
  const dayStart = startOfBangkokDay(date);
  const sections = await prisma.section.findMany({
    where: {
      roomId,
      dayOfWeek: dayName,
      isActive: true,
      term: {
        isActive: true,
        startDate: { lte: dayStart },
        endDate: { gte: dayStart },
      },
    },
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
        rangesOverlapByTimeText(slot.start, slot.end, section.startTime, section.endTime)
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
        approverId: reservationApproverId,
        requesterId: uid,
        roomId,
        date: dateOnly,
        slot: r.slot,
        startAt: r.startAt,
        endAt: r.endAt,
        note: note ?? null,
      }));

      await tx.reservation.createMany({ data });

      const created = await tx.reservation.findMany({
        where: {
          requesterId: uid,
          roomId,
          date: dateOnly,
          slot: { in: data.map((d) => d.slot) },
        },
        select: { id: true },
      });

      if (uniqueParticipants.length > 0 && created.length > 0) {
        for (const resv of created) {
          await tx.reservationParticipant.createMany({
            data: uniqueParticipants.map((userId) => ({ reservationId: resv.id, userId })),
            skipDuplicates: true,
          });
        }
      }

      return {
        ok: true as const,
        status: 200,
        count: data.length,
        reservationIds: created.map((r) => r.id),
      };
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
    }

    const statusInfo = getReservationStatusInfo(status);
    return NextResponse.json({
      ok: true,
      count: result.count,
      reservationIds: result.reservationIds ?? [],
      status,
      statusLabel: statusInfo.statusLabel,
      nextAction: statusInfo.nextAction,
    });
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
