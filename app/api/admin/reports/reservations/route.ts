import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  buildReservationWhere,
  getReportDateRange,
  normalizeReportFilters,
  reportFilterSchema,
} from "@/lib/reports/filters";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireAdmin();
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
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
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
  const skip = (filters.page - 1) * filters.pageSize;

  try {
    const [totalCount, items] = await prisma.$transaction([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip,
        take: filters.pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          startAt: true,
          endAt: true,
          room: {
            select: {
              roomNumber: true,
              floor: true,
              code: true,
              name: true,
            },
          },
          section: {
            select: {
              course: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          requester: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
              studentId: true,
              email: true,
            },
          },
          loan: {
            select: {
              checkedInAt: true,
              checkedOutAt: true,
              key: {
                select: {
                  keyCode: true,
                },
              },
              borrower: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  studentId: true,
                  email: true,
                },
              },
              returnedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  studentId: true,
                  email: true,
                },
              },
              handledBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  studentId: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      page: filters.page,
      pageSize: filters.pageSize,
      totalCount,
    });
  } catch (error) {
    console.error("[REPORT_RESERVATIONS_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
