import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type DayName = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

function toDayName(jsDay: number): DayName {
  // JS: 0=Sun ... 6=Sat
  return (["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay] as DayName) ?? "MON";
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function combineUTC(date: Date, timeHHmm: string) {
  const [hh, mm] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hh || 0, mm || 0, 0));
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

  const fromDate = startOfDayUTC(new Date(`${args.from}T00:00:00Z`));
  const toDate = startOfDayUTC(new Date(`${args.to}T00:00:00Z`));

  if (toDate < fromDate) {
    return { ok: false as const, message: "BAD_RANGE" };
  }

  const slot = `${section.startTime}-${section.endTime}`;

  const data: Prisma.ReservationCreateManyInput[] = [];
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const dayName = toDayName(d.getUTCDay());
    if (dayName !== section.dayOfWeek) continue;

    const dateOnly = startOfDayUTC(d);
    const startAt = combineUTC(d, section.startTime);
    const endAt = combineUTC(d, section.endTime);

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
