import { prisma } from "@/lib/db/prisma";

export type AdminDashboardMetrics = {
  pendingRequests: number;
  pendingCheckin: number;
  activeLoans: number;
  roomsActive: number;
  keysAvailable: number;
  keysBorrowed: number;
};

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [
    pendingRequests,
    pendingCheckin,
    activeLoans,
    roomsActive,
    keysAvailable,
    keysBorrowed,
  ] = await Promise.all([
    prisma.reservation.count({ where: { status: "PENDING" } }),
    prisma.reservation.count({ where: { status: "APPROVED", loan: null } }),
    prisma.reservation.count({ where: { status: "CHECKED_IN" } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.key.count({ where: { status: "AVAILABLE" } }),
    prisma.key.count({ where: { status: "BORROWED" } }),
  ]);

  return {
    pendingRequests,
    pendingCheckin,
    activeLoans,
    roomsActive,
    keysAvailable,
    keysBorrowed,
  };
}
