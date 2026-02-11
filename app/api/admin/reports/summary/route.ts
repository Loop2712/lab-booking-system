import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import {
  buildReservationWhere,
  getReportDateRange,
  normalizeReportFilters,
  reportFilterSchema,
} from "@/lib/reports/filters";

export const runtime = "nodejs";

function getGroupCount(
  item: { _count?: boolean | { _all?: number | null } | null } | null
) {
  if (!item || !item._count || typeof item._count === "boolean") return 0;
  return item._count._all ?? 0;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const parsed = reportFilterSchema.safeParse({
    dateFrom: url.searchParams.get("dateFrom"),
    dateTo: url.searchParams.get("dateTo"),
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    roomId: url.searchParams.get("roomId") ?? undefined,
    room: url.searchParams.get("room") ?? undefined,
    keyId: url.searchParams.get("keyId") ?? undefined,
    key: url.searchParams.get("key") ?? undefined,
    requester: url.searchParams.get("requester") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_QUERY", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const filters = normalizeReportFilters(parsed.data);
  const range = getReportDateRange(filters.dateFrom, filters.dateTo);
  if (!range) {
    return NextResponse.json(
      { ok: false, message: "INVALID_DATE_RANGE" },
      { status: 400 }
    );
  }

  const where = buildReservationWhere(filters, range);

  try {
    const [totalReservations, statusGroups, typeGroups] =
      await prisma.$transaction([
        prisma.reservation.count({ where }),
        prisma.reservation.groupBy({
          by: ["status"],
          where,
          orderBy: { status: "asc" },
          _count: { _all: true },
        }),
        prisma.reservation.groupBy({
          by: ["type"],
          where,
          orderBy: { type: "asc" },
          _count: { _all: true },
        }),
      ]);

    const statusMap = new Map(
      statusGroups.map((item) => [item.status, getGroupCount(item)])
    );
    const typeMap = new Map(
      typeGroups.map((item) => [item.type, getGroupCount(item)])
    );

    return NextResponse.json({
      ok: true,
      totalReservations,
      totalCompleted: statusMap.get("COMPLETED") ?? 0,
      totalCancelled: statusMap.get("CANCELLED") ?? 0,
      totalNoShow: statusMap.get("NO_SHOW") ?? 0,
      totalCheckedIn: statusMap.get("CHECKED_IN") ?? 0,
      breakdownByType: [
        { type: "IN_CLASS", count: typeMap.get("IN_CLASS") ?? 0 },
        { type: "AD_HOC", count: typeMap.get("AD_HOC") ?? 0 },
      ],
    });
  } catch (error) {
    console.error("[REPORT_SUMMARY_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
