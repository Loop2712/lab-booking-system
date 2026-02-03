import { prisma } from "@/lib/db/prisma";
import ReserveDialog from "@/app/(app)/student/reserve/reserve-dialog";
import RoomAvailability from "@/app/(app)/student/reserve/room-availability";

export default async function TeacherReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Teacher • BookingRoom (Ad-hoc)</h1>
          <p className="text-sm text-muted-foreground">
            จองห้องแบบจองเอง (AD_HOC) โดยเลือกเวลาเริ่มต้น-สิ้นสุด • อาจารย์จะได้รับการอนุมัติทันที
          </p>
        </div>
        <ReserveDialog rooms={rooms} label="จองห้อง" />
      </div>

      <RoomAvailability rooms={rooms} />
    </div>
  );
}
