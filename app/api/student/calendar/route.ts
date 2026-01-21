import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";
import { startOfDayUTC } from "@/lib/datetime";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireRoleApi(["STUDENT"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ ok: false, message: "BAD_RANGE" }, { status: 400 });
  }

  const fromDate = startOfDayUTC(from);
  const toDate = startOfDayUTC(to);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: auth.uid },
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
      requesterId: auth.uid,
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
