import { prisma } from "@/lib/db/prisma";
import { startOfBangkokDay } from "@/lib/date/bangkok";
import { addDaysYmd } from "@/lib/date";
import { bkkDayName } from "@/lib/date/bkkDayName";
import { timeToMinutesOrZero } from "@/lib/date/time";

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((x) => parseInt(x, 10));
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildBangkokDateTime(ymd: string, timeHHmm: string) {
  const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const h = Number.isFinite(hh) ? hh : 0;
  const m = Number.isFinite(mm) ? mm : 0;
  return new Date(
    `${ymd}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+07:00`
  );
}

export async function generateInClassReservations(args: {
  sectionId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}) {
  const section = await prisma.section.findUnique({
    where: { id: args.sectionId },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      roomId: true,
      teacherId: true,
    },
  });

  if (!section) {
    return { ok: false as const, message: "SECTION_NOT_FOUND" };
  }

  const slotId = `${section.startTime}-${section.endTime}`;
  if (!isValidTime(section.startTime) || !isValidTime(section.endTime)) {
    return { ok: false as const, message: "INVALID_TIME_FORMAT" };
  }
  if (timeToMinutesOrZero(section.endTime) <= timeToMinutesOrZero(section.startTime)) {
    return { ok: false as const, message: "INVALID_TIME_RANGE" };
  }

  if (!isYmd(args.from) || !isYmd(args.to) || args.to < args.from) {
    return { ok: false as const, message: "BAD_RANGE" };
  }

  const slot = slotId;

  const data: any[] = [];
  for (let ymd = args.from; ; ymd = addDaysYmd(ymd, 1)) {
    if (bkkDayName(ymd) !== section.dayOfWeek) {
      if (ymd === args.to) break;
      continue;
    }

    const dateOnly = startOfBangkokDay(ymd);
    const startAt = buildBangkokDateTime(ymd, section.startTime);
    const endAt = buildBangkokDateTime(ymd, section.endTime);

    data.push({
      type: "IN_CLASS",
      status: "APPROVED",
      requesterId: section.teacherId,
      approverId: section.teacherId,
      roomId: section.roomId,
      sectionId: section.id,
      date: dateOnly,
      slot,
      startAt,
      endAt,
      note: null,
    });

    if (ymd === args.to) break;
  }

  if (data.length === 0) {
    return { ok: true as const, created: 0 };
  }

  // unique([roomId, date, slot]) ช่วยกันซ้ำและกันชนกับ ad-hoc ด้วย
  const created = await prisma.reservation.createMany({
    data,
    skipDuplicates: true,
  });

  return { ok: true as const, created: created.count };
}
