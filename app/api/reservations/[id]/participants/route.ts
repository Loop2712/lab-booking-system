import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const addSchema = z.object({
  studentId: z.string().min(11).max(11), // 11 หลัก
});

function mustBeStudent(session: any) {
  return session?.role === "STUDENT" && typeof session?.uid === "string";
}

async function assertOwner(reservationId: string, uid: string) {
  const resv = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      type: true,
      status: true,
      requesterId: true,
    },
  });

  if (!resv) return { ok: false as const, status: 404, message: "NOT_FOUND" };
  if (resv.type !== "AD_HOC") return { ok: false as const, status: 400, message: "NOT_AD_HOC" };
  if (resv.requesterId !== uid) return { ok: false as const, status: 403, message: "FORBIDDEN" };

  // อนุญาตแก้รายชื่อได้เฉพาะก่อน CHECKED_IN
  if (["CHECKED_IN", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"].includes(resv.status)) {
    return { ok: false as const, status: 400, message: "STATUS_LOCKED" };
  }

  return { ok: true as const, resv };
}

// GET: ดูรายชื่อผู้ร่วม
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!mustBeStudent(session)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const uid = (session as any).uid as string;

  const check = await assertOwner(id, uid);
  if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: check.status });

  const participants = await prisma.reservationParticipant.findMany({
    where: { reservationId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      user: { select: { id: true, firstName: true, lastName: true, studentId: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    participants: participants.map((p) => ({
      id: p.id,
      userId: p.user.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      studentId: p.user.studentId,
    })),
  });
}

// POST: เพิ่มผู้ร่วมด้วย studentId (รวมทั้งหมดไม่เกิน 5 คน รวมผู้จอง)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!mustBeStudent(session)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const uid = (session as any).uid as string;

  const check = await assertOwner(id, uid);
  if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: check.status });

  const body = addSchema.parse(await req.json());

  // หา user จาก studentId
  const user = await prisma.user.findUnique({
    where: { studentId: body.studentId },
    select: { id: true, role: true, firstName: true, lastName: true, studentId: true },
  });

  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ ok: false, message: "STUDENT_NOT_FOUND" }, { status: 404 });
  }

  if (user.id === uid) {
    return NextResponse.json({ ok: false, message: "CANNOT_ADD_SELF" }, { status: 400 });
  }

  // จำกัด 5 คน (ผู้จอง 1 + participants สูงสุด 4)
  const currentCount = await prisma.reservationParticipant.count({
    where: { reservationId: id },
  });

  // รวมผู้จองด้วย => total = 1 + currentCount
  if (1 + currentCount >= 5) {
    return NextResponse.json({ ok: false, message: "LIMIT_EXCEEDED" }, { status: 400 });
  }

  // กันซ้ำ (unique ที่ schema ก็กัน แต่เราทำให้ message สวยขึ้น)
  const exists = await prisma.reservationParticipant.findFirst({
    where: { reservationId: id, userId: user.id },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ ok: false, message: "ALREADY_ADDED" }, { status: 400 });
  }

  const created = await prisma.reservationParticipant.create({
    data: { reservationId: id, userId: user.id },
    select: {
      id: true,
      user: { select: { id: true, firstName: true, lastName: true, studentId: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    participant: {
      id: created.id,
      userId: created.user.id,
      name: `${created.user.firstName} ${created.user.lastName}`,
      studentId: created.user.studentId,
    },
  });
}

// DELETE: ลบผู้ร่วม (ส่ง participantId)
const delSchema = z.object({ participantId: z.string().min(1) });

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!mustBeStudent(session)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  const uid = (session as any).uid as string;

  const check = await assertOwner(id, uid);
  if (!check.ok) return NextResponse.json({ ok: false, message: check.message }, { status: check.status });

  const body = delSchema.parse(await req.json());

  // ลบได้เฉพาะ participant ที่อยู่ใน reservation นี้
  const p = await prisma.reservationParticipant.findUnique({
    where: { id: body.participantId },
    select: { id: true, reservationId: true },
  });

  if (!p || p.reservationId !== id) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.reservationParticipant.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
