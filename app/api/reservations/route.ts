import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";
import { bangkokDateTimeToUTC, startOfDayUTC } from "@/lib/datetime";

export const runtime = "nodejs";

// helper: slot → time
function slotToTime(slot: string, date: string) {
  // slot ตัวอย่าง: "08:00-12:00"
  const [s, e] = slot.split("-");
  const startAt = bangkokDateTimeToUTC(date, s);
  const endAt = bangkokDateTimeToUTC(date, e);
  return { startAt, endAt };
}

const createReservationSchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireRoleApi(["STUDENT", "TEACHER", "ADMIN"], { requireUid: true });
    if (!auth.ok) return auth.response;

    const body = createReservationSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json(
        { ok: false, message: "BAD_BODY", detail: body.error.flatten() },
        { status: 400 }
      );
    }

    const { roomId, date, slotId, note } = body.data;

    // แปลง slot → startAt / endAt
    const { startAt, endAt } = slotToTime(slotId, date);

    const isTeacher = auth.role === "TEACHER";
    const isAdmin = auth.role === "ADMIN";

    const reservation = await prisma.reservation.create({
      data: {
        type: "AD_HOC",

        // ⭐ requirement หลัก
        status: (isTeacher || isAdmin) ? "APPROVED" : "PENDING",
        approverId: (isTeacher || isAdmin) ? auth.uid ?? null : null,

        requesterId: auth.uid,
        roomId,
        date: startOfDayUTC(date),
        slot: slotId,
        startAt,
        endAt,
        note: note ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      reservation,
    });
  } catch (e: any) {
    console.error("[RESERVATION_CREATE_ERROR]", e);

    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
