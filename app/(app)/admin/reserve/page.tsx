import { prisma } from "@/lib/db/prisma";
import ReserveForm from "@/app/(app)/student/reserve/reserve-form";

export default async function AdminReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin • BookingRoom (Ad-hoc)</h1>
      <p className="text-sm text-muted-foreground">
        จองห้องแบบจองเอง (AD_HOC) โดยเลือกช่วงเวลา 4 ชั่วโมง • แอดมินจะได้รับการอนุมัติทันที
      </p>

      <ReserveForm rooms={rooms} />
    </div>
  );
}
