import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function isStudent(role?: string) {
  return role === "STUDENT";
}

function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  const uid = (session as any)?.uid as string | undefined;

  if (!isStudent(role) || !uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });
  }

  const fromDate = startOfDayUTC(from);
  const toDate = startOfDayUTC(to);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: uid },
    select: { sectionId: true },
  });
  const sectionIds = enrollments.map((e) => e.sectionId);

  // 1) คาบเรียน (จาก Section ของที่ลงทะเบียน)
  const sections = await prisma.section.findMany({
    where: { id: { in: sectionIds }, isActive: true },
    include: {
      course: true,
      room: true,
      teacher: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // 2) จอง/การใช้ห้องของนักศึกษาในช่วงวัน (AD_HOC ที่ requester เป็นตัวเอง)
  const adhoc = await prisma.reservation.findMany({
    where: {
      type: "AD_HOC",
      requesterId: uid,
      date: { gte: fromDate, lte: toDate },
    },
    include: { room: true },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  // 3) IN_CLASS ที่ถูก generate ของ section ที่ตัวเองลงทะเบียน (แสดงเป็น “คาบนี้ใช้ห้องได้”)
  const inClass = await prisma.reservation.findMany({
    where: {
      type: "IN_CLASS",
      sectionId: { in: sectionIds },
      date: { gte: fromDate, lte: toDate },
    },
    include: {
      room: true,
      section: { include: { course: true, teacher: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    sections,
    reservations: {
      adhoc,
      inClass,
    },
  });
}
