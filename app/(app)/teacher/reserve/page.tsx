import { prisma } from "@/lib/db/prisma";
import ReserveForm from "@/app/student/reserve/reserve-form";

export const runtime = "nodejs";

export default async function TeacherReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Teacher • จองห้อง (Ad-hoc)</h1>
      <p className="text-sm text-muted-foreground">
        เลือกห้อง วันที่ และช่วงเวลา (ครั้งละไม่เกิน 4 ชั่วโมง) • สำหรับอาจารย์ระบบจะอนุมัติให้อัตโนมัติ
      </p>

      <ReserveForm rooms={rooms} />
    </div>
  );
}
