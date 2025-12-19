import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

// helper: slot → time
function slotToTime(slot: string, date: string) {
  // slot ตัวอย่าง: "08:00-12:00"
  const [s, e] = slot.split("-");
  const startAt = new Date(`${date}T${s}:00+07:00`);
  const endAt = new Date(`${date}T${e}:00+07:00`);
  return { startAt, endAt };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const role = (session as any)?.role;
    const uid =
      (session as any)?.uid ||
      (session as any)?.user?.id;

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

    const body = await req.json();
    const { roomId, date, slotId, note } = body;

    if (!roomId || !date || !slotId) {
      return NextResponse.json(
        { ok: false, message: "ข้อมูลไม่ครบ (roomId, date, slotId)" },
        { status: 400 }
      );
    }

    // แปลง slot → startAt / endAt
    const { startAt, endAt } = slotToTime(slotId, date);

    const isTeacher = role === "TEACHER";
    const isAdmin = role === "ADMIN";

    const reservation = await prisma.reservation.create({
      data: {
        type: "AD_HOC",

        // ⭐ requirement หลัก
        status: (isTeacher || isAdmin) ? "APPROVED" : "PENDING",
        approverId: (isTeacher || isAdmin) ? uid : null,

        requesterId: uid,
        roomId,
        date: new Date(date),
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
