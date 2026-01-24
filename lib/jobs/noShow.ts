import { prisma } from "@/lib/db/prisma";

const LATE_MINUTES = 30;

export async function markNoShowReservations(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - LATE_MINUTES * 60 * 1000);
  const result = await prisma.reservation.updateMany({
    where: {
      status: "APPROVED",
      startAt: { lte: cutoff },
      loan: { is: null },
    },
    data: { status: "NO_SHOW" },
  });

  return result.count;
}
