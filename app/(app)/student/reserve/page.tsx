import { prisma } from "@/lib/db/prisma";
import ReserveForm from "./reserve-form";

export default async function StudentReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">จองห้องปฏิบัติการ</h1>
      <p className="text-sm text-muted-foreground">
        เลือกห้อง วันที่ และช่วงเวลา (ครั้งละไม่เกิน 4 ชั่วโมง)
      </p>

      <ReserveForm rooms={rooms} />
    </div>
  );
}
