import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { findSlot } from "@/lib/reserve/slots";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  slotId: z.string().min(1), // "08:00-12:00"
  note: z.string().optional(),
});

function startOfDay(dateStr: string) {
  // เก็บ date เป็นวัน (00:00)
  return new Date(`${dateStr}T00:00:00`);
}

function combine(dateStr: string, time: string) {
  // รวมวัน + เวลาเป็น DateTime
  return new Date(`${dateStr}T${time}:00`);
}

function diffDays(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ua - ub) / ms);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const requesterId = (session as any)?.uid as string | undefined;
    const role = (session as any)?.role as string | undefined;

    if (!requesterId || role !== "STUDENT") {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());
    const slot = findSlot(body.slotId);
    if (!slot) {
      return NextResponse.json({ ok: false, message: "INVALID_SLOT" }, { status: 400 });
    }

    const date0 = startOfDay(body.date);
    const startAt = combine(body.date, slot.start);
    const endAt = combine(body.date, slot.end);

    // กติกา: จองล่วงหน้า 0..30 วัน
    const daysAhead = diffDays(date0, new Date());
    if (daysAhead < 0 || daysAhead > 30) {
      return NextResponse.json({ ok: false, message: "DATE_OUT_OF_RANGE" }, { status: 400 });
    }

    // เช็คชนเวลา (เผื่ออนาคตไม่ได้ใช้ slot แบบ fixed)
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId: body.roomId,
        // ตัดสถานะที่ "ไม่ถือว่าจอง" แล้วออก
        status: { notIn: ["CANCELLED", "REJECTED"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json({ ok: false, message: "ROOM_ALREADY_RESERVED" }, { status: 409 });
    }

    const reservation = await prisma.reservation.create({
      data: {
        type: "AD_HOC",
        status: "PENDING",
        requesterId,
        roomId: body.roomId,
        date: date0,
        slot: slot.id,
        startAt,
        endAt,
        note: body.note ?? null,
      },
    });

    return NextResponse.json({ ok: true, reservation });
  } catch (e: any) {
    // unique constraint ก็ยังกันซ้ำได้อีกชั้น
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "ROOM_ALREADY_RESERVED" }, { status: 409 });
    }
    if (e?.issues) {
      return NextResponse.json({ ok: false, message: "VALIDATION_ERROR", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: "ERROR", detail: e?.message }, { status: 500 });
  }
}
