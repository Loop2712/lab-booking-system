import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { findSlot } from "@/lib/reserve/slots";
import { todayYmdBkk, addDaysYmd, isYmdBetweenInclusive  } from "@/lib/date/index";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  date: z.string().min(8), // "YYYY-MM-DD"
  slotId: z.string().min(1),
  note: z.string().optional().nullable(),
});

// helper แปลง slot → เวลา
function slotToTime(slot: string, date: string) {
  const [s, e] = slot.split("-");
  const startAt = new Date(`${date}T${s}:00+07:00`);
  const endAt = new Date(`${date}T${e}:00+07:00`);
  return { startAt, endAt };
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

  const { roomId, date, slotId, note } = parsed.data;

  // ✅ validate slot (UI expects INVALID_SLOT)
  const slot = findSlot(slotId);
  if (!slot) {
    return NextResponse.json(
      { ok: false, message: "INVALID_SLOT" },
      { status: 400 }
    );
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

  const { startAt, endAt } = slotToTime(slotId, date);
  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";

  try {
    const reservation = await prisma.reservation.create({
      data: {
        type: "AD_HOC",
        status: isTeacher || isAdmin ? "APPROVED" : "PENDING",
        approverId: isTeacher || isAdmin ? uid : null,
        requesterId: uid,
        roomId,
        date: new Date(`${date}T00:00:00+07:00`),
        slot: slotId,
        startAt,
        endAt,
        note: note ?? null,
      },
    });

    return NextResponse.json({ ok: true, reservation });
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
