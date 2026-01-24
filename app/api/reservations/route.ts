import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import type { ReservationStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";
import { areConsecutiveSlots, findSlot } from "@/lib/reserve/slots";
import { todayYmdBkk, addDaysYmd, isYmdBetweenInclusive  } from "@/lib/date/index";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  date: z.string().min(8), // "YYYY-MM-DD"
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
  const selectedSlots = Array.from(
    new Set([...(slotIds ?? []), ...(slotId ? [slotId] : [])])
  );

  if (selectedSlots.length === 0) {
    return NextResponse.json(
      { ok: false, message: "INVALID_SLOT" },
      { status: 400 }
    );
  }

  if (selectedSlots.length > 2) {
    return NextResponse.json(
      { ok: false, message: "TOO_MANY_SLOTS" },
      { status: 400 }
    );
  }

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

  // ✅ validate date range: วันนี้ .. วันนี้+30 (inclusive) (UI expects DATE_OUT_OF_RANGE)
  const minYmd = todayYmdBkk();
  const maxYmd = addDaysYmd(minYmd, 30);
  if (!isYmdBetweenInclusive(date, minYmd, maxYmd)) {
    return NextResponse.json(
      { ok: false, message: "DATE_OUT_OF_RANGE" },
      { status: 400 }
    );
  }

  const isTeacher = role === "TEACHER";
  const isAdmin = role === "ADMIN";
  const status: ReservationStatus = isTeacher || isAdmin ? "APPROVED" : "PENDING";

  try {
    const dateOnly = new Date(`${date}T00:00:00+07:00`);
    const result = await prisma.$transaction(async (tx) => {
      const conflict = await tx.reservation.findFirst({
        where: {
          roomId,
          date: dateOnly,
          slot: { in: selectedSlots },
        },
        select: { id: true },
      });
      if (conflict) return { ok: false as const, status: 409, message: "ROOM_ALREADY_RESERVED" };

      const data = selectedSlots.map((slot) => {
        const { startAt, endAt } = slotToTime(slot, date);
        return {
          type: "AD_HOC" as const,
<<<<<<< ours
<<<<<<< ours
          status: isTeacher || isAdmin ? "APPROVED" : "PENDING",
=======
          status,
>>>>>>> theirs
=======
          status,
>>>>>>> theirs
          approverId: isTeacher || isAdmin ? uid : null,
          requesterId: uid,
          roomId,
          date: dateOnly,
          slot,
          startAt,
          endAt,
          note: note ?? null,
        };
      });

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
