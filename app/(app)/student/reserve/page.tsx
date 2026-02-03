import { prisma } from "@/lib/db/prisma";
import ReserveDialog from "./reserve-dialog";
import RoomAvailability from "./room-availability";

export default async function StudentReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">จองห้องปฏิบัติการ</h1>
          <p className="text-sm text-muted-foreground">
            เลือกห้อง วันที่ และเวลาเริ่มต้น-สิ้นสุดสำหรับการจอง
          </p>
        </div>
        <ReserveDialog rooms={rooms} label="จองห้อง" />
      </div>

      <RoomAvailability rooms={rooms} />
    </div>
  );
}
