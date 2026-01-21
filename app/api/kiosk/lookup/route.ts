import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";
import { requireScannerKey } from "../_util";
import { addDaysUTC, getBangkokYMD, startOfBangkokDayUTC } from "@/lib/datetime";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  token: z.string().min(10),
  mode: z.enum(["CHECKIN", "RETURN"]),
});

export async function POST(req: Request) {
  const gate = requireScannerKey(req);
  if (!gate.ok) return gate.res;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const vt = verifyUserQrToken(body.data.token);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const uid = vt.uid;

  // หาวันนี้ (Bangkok)
  const ymd = getBangkokYMD(new Date());
  const dayStart = startOfBangkokDayUTC(ymd);
  const dayEnd = addDaysUTC(dayStart, 1);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, firstName: true, lastName: true, role: true, studentId: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  const room = await prisma.room.findUnique({
    where: { id: body.data.roomId },
    select: { id: true, code: true, name: true, roomNumber: true, floor: true, isActive: true },
  });
  if (!room || !room.isActive) {
    return NextResponse.json({ ok: false, message: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  // เลือก reservation ที่ “ตรงห้อง+วันนี้+ผู้ใช้” ให้เหมาะกับ mode
  // CHECKIN: หา APPROVED (ยังไม่ checked_in)
  // RETURN: หา CHECKED_IN
  const wantedStatus = body.data.mode === "CHECKIN" ? "APPROVED" : "CHECKED_IN";

  // เงื่อนไขผู้ใช้เป็นเจ้าของ: requesterId หรือเป็น participant
  const reservations = await prisma.reservation.findMany({
    where: {
      roomId: room.id,
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      status: wantedStatus as any,
      OR: [
        { requesterId: user.id },
        { participants: { some: { userId: user.id } } },
      ],
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      type: true,
      status: true,
      slot: true,
      startAt: true,
      endAt: true,
      requesterId: true,
    },
  });

  if (!reservations.length) {
    return NextResponse.json(
      {
        ok: false,
        message:
          body.data.mode === "CHECKIN"
            ? "NO_MATCHING_APPROVED_RESERVATION_TODAY"
            : "NO_MATCHING_CHECKEDIN_RESERVATION_TODAY",
      },
      { status: 404 }
    );
  }

  // เลือกตัวแรกตามเวลา (จองช่วงเช้าก็ขึ้นก่อน)
  const reservation = reservations[0];

  return NextResponse.json({
    ok: true,
    mode: body.data.mode,
    user,
    room,
    reservation,
  });
}
