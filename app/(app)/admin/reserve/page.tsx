import { prisma } from "@/lib/db/prisma";
import BookingCenter from "@/components/booking/BookingCenter";

export default async function AdminReservePage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    select: { id: true, code: true, name: true, roomNumber: true, floor: true },
  });

  return <BookingCenter rooms={rooms} role="ADMIN" />;
}
