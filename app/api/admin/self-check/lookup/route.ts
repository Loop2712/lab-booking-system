import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import { verifyUserQrToken } from "@/lib/security/user-qr";
import { addDays } from "@/lib/date/addDays";
import { getBangkokYMD, startOfBangkokDay } from "@/lib/date/bangkok";

export const runtime = "nodejs";

const bodySchema = z.object({
  roomId: z.string().min(1),
  token: z.string().min(10),
  mode: z.enum(["CHECKIN", "RETURN"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const vt = verifyUserQrToken(body.data.token);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const uid = vt.uid;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, firstName: true, lastName: true, role: true, studentId: true, email: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (user.role !== "STUDENT" && user.role !== "TEACHER") {
    return NextResponse.json({ ok: false, message: "ROLE_NOT_ALLOWED" }, { status: 403 });
  }

  const room = await prisma.room.findUnique({
    where: { id: body.data.roomId },
    select: { id: true, code: true, name: true, roomNumber: true, floor: true, isActive: true },
  });
  if (!room || !room.isActive) {
    return NextResponse.json({ ok: false, message: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const ymd = getBangkokYMD(new Date());
  const dayStart = startOfBangkokDay(ymd);
  const dayEnd = addDays(dayStart, 1);

  const wantedStatus = body.data.mode === "CHECKIN" ? "APPROVED" : "CHECKED_IN";

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

  const reservation = reservations[0];

  return NextResponse.json({
    ok: true,
    mode: body.data.mode,
    user,
    room,
    reservation,
  });
}
