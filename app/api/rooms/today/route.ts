import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { addDays } from "@/lib/date/addDays";
import { getBangkokYMD, startOfBangkokDay } from "@/lib/date/bangkok";
import { bkkDayName } from "@/lib/date/bkkDayName";
import { getSessionRole } from "@/lib/auth/session";

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

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = getSessionRole(session);

    // ✅ publicAllowed: ถ้าไม่ login ก็ยังดูได้ แต่จะ "ซ่อนชื่อผู้จอง"
    const isAuthed = !!session && !!role;

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const isValidYmd = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
    const ymd = isValidYmd ? dateParam : getBangkokYMD(new Date());
    const dayStart = startOfBangkokDay(ymd);
    const dayEnd = addDays(dayStart, 1);

    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
      select: { id: true, code: true, name: true, roomNumber: true, floor: true },
    });

    const reservations = await prisma.reservation.findMany({
      where: {
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        status: { in: ["APPROVED", "CHECKED_IN", "COMPLETED", "NO_SHOW"] },
      },
      select: {
        id: true,
        roomId: true,
        sectionId: true,
        slot: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        note: true,
        requester: {
          select: { firstName: true, lastName: true, role: true },
        },
        section: {
          select: {
            course: { select: { code: true, name: true } },
          },
        },
        loan: {
          select: {
            borrower: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const inClassSectionIds = new Set(
      reservations
        .filter((r) => r.type === "IN_CLASS" && r.sectionId)
        .map((r) => r.sectionId as string)
    );

    const sections = await prisma.section.findMany({
      where: {
        isActive: true,
        dayOfWeek: bkkDayName(ymd),
        ...(inClassSectionIds.size ? { id: { notIn: Array.from(inClassSectionIds) } } : {}),
        term: {
          isActive: true,
          startDate: { lte: dayStart },
          endDate: { gte: dayStart },
        },
      },
      select: {
        id: true,
        roomId: true,
        startTime: true,
        endTime: true,
        course: { select: { code: true, name: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    const booked: Record<string, any[]> = {};
    for (const r of reservations) {
      if (!booked[r.roomId]) booked[r.roomId] = [];

      booked[r.roomId].push({
        reservationId: r.id,
        slot: r.slot,
        type: r.type,
        status: r.status,
        // ✅ ถ้าไม่ได้ login ให้ซ่อนข้อมูลผู้จอง
        requesterLabel: isAuthed ? `${r.requester.firstName} ${r.requester.lastName} (${r.requester.role})` : null,
        borrowerLabel: isAuthed && r.loan?.borrower
          ? `${r.loan.borrower.firstName} ${r.loan.borrower.lastName}`
          : null,
        courseLabel: r.section?.course
          ? `${r.section.course.code} ${r.section.course.name}`
          : null,
        note: isAuthed ? r.note ?? null : null,
        startAt: r.startAt,
        endAt: r.endAt,
      });
    }

    for (const s of sections) {
      const startAt = buildBangkokDateTime(ymd, s.startTime);
      const endAt = buildBangkokDateTime(ymd, s.endTime);
      if (!startAt || !endAt) continue;
      if (!booked[s.roomId]) booked[s.roomId] = [];

      booked[s.roomId].push({
        reservationId: `section-${s.id}-${ymd}`,
        slot: `${normalizeTime(s.startTime)}-${normalizeTime(s.endTime)}`,
        type: "IN_CLASS",
        status: "APPROVED",
        requesterLabel: isAuthed ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
        borrowerLabel: isAuthed ? `${s.teacher.firstName} ${s.teacher.lastName}` : null,
        courseLabel: `${s.course.code} ${s.course.name}`,
        note: null,
        startAt,
        endAt,
      });
    }

    return NextResponse.json({
      ok: true,
      public: !isAuthed,
      date: ymd,
      rooms: rooms.map((room) => ({
        ...room,
        slots: (booked?.[room.id] ?? [])
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          .map((booking) => ({
          slotId: booking.reservationId,
          label: booking.slot,
          booking,
        })),
      })),
    });
  } catch (e: any) {
    console.error("[API_ROOMS_TODAY_ERROR]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
