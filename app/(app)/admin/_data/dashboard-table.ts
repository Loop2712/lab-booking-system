import { prisma } from "@/lib/db/prisma";

type DashboardRow = {
  id: number;
  header: string;
  type: string;
  status: string;
  target: string;
  limit: string;
  reviewer: string;
};

const DONE_STATUSES = new Set(["COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"]);

function formatYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getAdminDashboardTableRows(): Promise<DashboardRow[]> {
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      room: { select: { code: true, name: true } },
      requester: { select: { firstName: true, lastName: true } },
    },
  });

  return reservations.map((r, index) => ({
    id: index + 1,
    header: `${r.room.code} • ${r.room.name}`,
    type: r.type === "IN_CLASS" ? "ตารางเรียน" : "จองนอกตาราง",
    status: DONE_STATUSES.has(r.status) ? "Done" : "In Process",
    target: r.slot,
    limit: formatYmd(r.date),
    reviewer: `${r.requester.firstName} ${r.requester.lastName}`,
  }));
}
