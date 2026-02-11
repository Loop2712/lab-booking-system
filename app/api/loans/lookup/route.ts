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
  userToken: z.string().min(10),
  mode: z.enum(["CHECKIN", "RETURN"]).optional(),
});

function pickClosestToNow<T extends { startAt: Date }>(list: T[]) {
  if (!list.length) return null;
  const now = Date.now();
  const sorted = [...list].sort(
    (a, b) => Math.abs(a.startAt.getTime() - now) - Math.abs(b.startAt.getTime() - now)
  );
  return sorted[0] ?? null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["TEACHER", "ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: body.error.flatten() },
      { status: 400 }
    );
  }

  const vt = verifyUserQrToken(body.data.userToken);
  if (!vt.ok) {
    return NextResponse.json({ ok: false, message: "BAD_QR_TOKEN", reason: vt.reason }, { status: 400 });
  }
  const uid = vt.uid;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, firstName: true, lastName: true, role: true, studentId: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, message: "USER_NOT_FOUND" }, { status: 404 });
  }

  const ymd = getBangkokYMD(new Date());
  const dayStart = startOfBangkokDay(ymd);
  const dayEnd = addDays(dayStart, 1);

  const checkinCandidates = await prisma.reservation.findMany({
    where: {
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      status: "APPROVED",
      loan: null,
      OR: [
        { requesterId: user.id },
        { participants: { some: { userId: user.id } } },
        { type: "IN_CLASS", section: { enrollments: { some: { studentId: user.id } } } },
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
      room: { select: { id: true, code: true, name: true, roomNumber: true, floor: true } },
    },
  });

  const returnCandidates = await prisma.reservation.findMany({
    where: {
      loan: { is: { checkedOutAt: null } },
      OR: [
        { requesterId: user.id },
        { participants: { some: { userId: user.id } } },
        { loan: { is: { borrowerId: user.id } } },
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
      room: { select: { id: true, code: true, name: true, roomNumber: true, floor: true } },
    },
  });

  let mode = body.data.mode;
  if (!mode) {
    mode = returnCandidates.length ? "RETURN" : checkinCandidates.length ? "CHECKIN" : undefined;
  }

  if (!mode) {
    return NextResponse.json(
      { ok: false, message: "NO_MATCHING_RESERVATION" },
      { status: 404 }
    );
  }

  const list = mode === "RETURN" ? returnCandidates : checkinCandidates;
  if (!list.length) {
    return NextResponse.json(
      {
        ok: false,
        message: mode === "RETURN" ? "NO_MATCHING_CHECKEDIN_RESERVATION" : "NO_MATCHING_APPROVED_RESERVATION",
      },
      { status: 404 }
    );
  }

  const reservation = pickClosestToNow(list) ?? list[0];

  return NextResponse.json({
    ok: true,
    mode,
    user,
    reservation: {
      ...reservation,
      startAt: reservation.startAt.toISOString(),
      endAt: reservation.endAt.toISOString(),
    },
    candidatesCount: list.length,
  });
}
