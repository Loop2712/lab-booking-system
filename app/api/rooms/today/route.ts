import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { TIME_SLOTS } from "@/lib/reserve/slots";

export const runtime = "nodejs";

function getBangkokYMD(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const dd = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${dd}`;
}

function startOfBangkokDay(ymd: string) {
  return new Date(`${ymd}T00:00:00.000+07:00`);
}

function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role as string | undefined;

    // ✅ publicAllowed: ถ้าไม่ login ก็ยังดูได้ แต่จะ "ซ่อนชื่อผู้จอง"
    const isAuthed = !!session && !!role;

    const ymd = getBangkokYMD(new Date());
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
        NOT: [{ status: "CANCELLED" }, { status: "REJECTED" }],
      },
      select: {
        id: true,
        roomId: true,
        slot: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        requester: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    });

    const booked: Record<string, Record<string, any>> = {};
    for (const r of reservations) {
      if (!booked[r.roomId]) booked[r.roomId] = {};

      booked[r.roomId][r.slot] = {
        reservationId: r.id,
        slot: r.slot,
        type: r.type,
        status: r.status,
        // ✅ ถ้าไม่ได้ login ให้ซ่อนข้อมูลผู้จอง
        requesterLabel: isAuthed ? `${r.requester.firstName} ${r.requester.lastName} (${r.requester.role})` : null,
        startAt: r.startAt,
        endAt: r.endAt,
      };
    }

    return NextResponse.json({
      ok: true,
      public: !isAuthed,
      date: ymd,
      slots: TIME_SLOTS,
      rooms: rooms.map((room) => ({
        ...room,
        slots: TIME_SLOTS.map((s) => ({
          slotId: s.id,
          label: s.label,
          booking: booked?.[room.id]?.[s.id] ?? null,
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
