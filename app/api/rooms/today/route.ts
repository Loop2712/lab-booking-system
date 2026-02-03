import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { addDays } from "@/lib/date/addDays";
import { getBangkokYMD, startOfBangkokDay } from "@/lib/date/bangkok";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role as string | undefined;

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
        courseLabel: isAuthed && r.section?.course
          ? `${r.section.course.code} ${r.section.course.name}`
          : null,
        note: isAuthed ? r.note ?? null : null,
        startAt: r.startAt,
        endAt: r.endAt,
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
