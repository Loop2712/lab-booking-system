import React from "react";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  buildReservationWhere,
  getReportDateRange,
  normalizeReportFilters,
  reportFilterSchema,
} from "@/lib/reports/filters";

export const runtime = "nodejs";

let fontsReady = false;

function ensureFonts() {
  if (fontsReady) return;
  const candidates = [
    path.join(process.cwd(), "public", "fonts"),
    path.join(process.cwd(), ".next", "standalone", "public", "fonts"),
  ];
  const fontDir = candidates.find((dir) => fs.existsSync(dir));
  if (!fontDir) {
    throw new Error("FONT_DIR_NOT_FOUND");
  }
  Font.register({
    family: "Kanit",
    fonts: [
      {
        src: path.join(fontDir, "Kanit-Regular.ttf"),
        fontWeight: "normal",
      },
      {
        src: path.join(fontDir, "Kanit-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  });
  fontsReady = true;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: "Kanit",
    color: "#111",
  },
  title: { fontSize: 16, marginBottom: 4, fontWeight: "bold" },
  subtitle: { fontSize: 10, marginBottom: 12, color: "#555" },
  sectionTitle: { fontSize: 11, marginBottom: 6, fontWeight: "bold" },
  summaryList: { marginBottom: 12 },
  summaryItem: { marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 2,
  },
  cell: {
    paddingRight: 4,
    flexBasis: 0,
  },
  colRoom: { flexGrow: 0.7 },
  colKey: { flexGrow: 0.8 },
  colRequester: { flexGrow: 1.5 },
  colType: { flexGrow: 0.8 },
  colStatus: { flexGrow: 0.9 },
  colBorrower: { flexGrow: 1.2 },
  colCheckIn: { flexGrow: 1 },
  colReturnedBy: { flexGrow: 1.2 },
  colCheckOut: { flexGrow: 1 },
});

type Summary = {
  totalReservations: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  totalCheckedIn: number;
  breakdownByType: { type: string; count: number }[];
};

type PdfItem = {
  id: string;
  type: string;
  status: string;
  startAt: string | Date;
  endAt: string | Date;
  room: { roomNumber: string; floor: number };
  section?: {
    course?: { code: string; name: string } | null;
  } | null;
  requester: {
    firstName: string;
    lastName: string;
    role: string;
    studentId: string | null;
    email: string | null;
  };
  loan: {
    checkedInAt: string | Date | null;
    checkedOutAt: string | Date | null;
    key: { keyCode: string };
    borrower: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
    returnedBy: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
    handledBy: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
  } | null;
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getGroupCount(
  item: { _count?: boolean | { _all?: number | null } | null } | null
) {
  if (!item || !item._count || typeof item._count === "boolean") return 0;
  return item._count._all ?? 0;
}

async function toNodeBuffer(input: unknown): Promise<Buffer> {
  if (!input) return Buffer.alloc(0);
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (input instanceof Uint8Array) return Buffer.from(input);
  const maybeBlob = input as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybeBlob.arrayBuffer === "function") {
    const arr = await maybeBlob.arrayBuffer();
    return Buffer.from(arr);
  }
  const maybeNodeStream = input as {
    on?: (event: string, cb: (...args: any[]) => void) => void;
    pipe?: (dest: any) => void;
  };
  if (typeof maybeNodeStream.on === "function") {
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      maybeNodeStream.on?.("data", (chunk: Buffer | Uint8Array) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      maybeNodeStream.on?.("end", () => resolve(Buffer.concat(chunks)));
      maybeNodeStream.on?.("error", (err: Error) => reject(err));
    });
  }
  const maybeWebStream = input as {
    getReader?: () => ReadableStreamDefaultReader<Uint8Array>;
  };
  if (typeof maybeWebStream.getReader === "function") {
    const reader = maybeWebStream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }
  return Buffer.alloc(0);
}

function ReportDocument({
  dateRangeLabel,
  summary,
  items,
}: {
  dateRangeLabel: string;
  summary: Summary;
  items: PdfItem[];
}) {
  const h = React.createElement;

  const formatNameOnly = (user?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null) => {
    if (!user) return "-";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return name || "-";
  };

  const formatStudentId = (user?: { studentId?: string | null } | null) => {
    return user?.studentId ?? "-";
  };

  const formatCourseLine = (item: PdfItem) => {
    const course = item.section?.course;
    if (!course) return "-";
    const code = course.code ?? "";
    const name = course.name ?? "";
    return [code, name].filter(Boolean).join(" ");
  };

  const formatDateLines = (value?: string | Date | null) => {
    if (!value) return { time: "-", date: "-" };
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return { time: "-", date: "-" };
    return {
      time: timeFormatter.format(d),
      date: dateFormatter.format(d),
    };
  };

  const formatTypeLabel = (value: string) => {
    if (value === "IN_CLASS") return "ตารางเรียน";
    if (value === "AD_HOC") return "จอง";
    return value;
  };

  const cell = (text: string, style: any) =>
    h(Text, { style: [styles.cell, style] as any }, text);

  const cellLines = (line1: string, line2: string, style: any) =>
    h(
      View,
      { style: [styles.cell, style] as any },
      h(Text, null, line1),
      h(Text, null, line2)
    );

  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page },
      h(Text, { style: styles.title }, "รายงานการจองห้อง"),
      h(Text, { style: styles.subtitle }, `ช่วงวันที่: ${dateRangeLabel}`),
      h(Text, { style: styles.sectionTitle }, "สรุปผล"),
      h(
        View,
        { style: styles.summaryList },
        h(
          Text,
          { style: styles.summaryItem },
          `จำนวนการจองทั้งหมด: ${summary.totalReservations}`
        ),
        h(
          Text,
          { style: styles.summaryItem },
          `เสร็จสิ้น: ${summary.totalCompleted}`
        ),
        h(
          Text,
          { style: styles.summaryItem },
          `ยกเลิก: ${summary.totalCancelled}`
        ),
        h(
          Text,
          { style: styles.summaryItem },
          `ไม่มาใช้ (No Show): ${summary.totalNoShow}`
        ),
        h(
          Text,
          { style: styles.summaryItem },
          `เช็คอินแล้ว: ${summary.totalCheckedIn}`
        ),
        ...summary.breakdownByType.map((item) =>
          h(
            Text,
            { style: styles.summaryItem, key: item.type },
            `${formatTypeLabel(item.type)}: ${item.count}`
          )
        )
      ),
      h(Text, { style: styles.sectionTitle }, "รายการจอง"),
      h(
        View,
        { style: styles.tableHeader },
        cell("ห้อง", styles.colRoom),
        cell("กุญแจ", styles.colKey),
        cell("ผู้จอง", styles.colRequester),
        cell("ประเภท", styles.colType),
        cell("สถานะ", styles.colStatus),
        cell("ผู้ยืมกุญแจ", styles.colBorrower),
        cell("เช็คอิน", styles.colCheckIn),
        cell("ผู้คืนกุญแจ", styles.colReturnedBy),
        cell("เช็คเอาท์", styles.colCheckOut)
      ),
      ...items.map((item) =>
        h(
          View,
          { style: styles.tableRow, key: item.id },
          cell(item.room?.roomNumber ?? "-", styles.colRoom),
          cell(item.loan?.key?.keyCode ?? "-", styles.colKey),
          cellLines(formatNameOnly(item.requester), formatCourseLine(item), styles.colRequester),
          cell(formatTypeLabel(item.type), styles.colType),
          cell(item.status, styles.colStatus),
          cellLines(
            formatNameOnly(item.loan?.borrower ?? undefined),
            formatStudentId(item.loan?.borrower ?? undefined),
            styles.colBorrower
          ),
          (() => {
            const { time, date } = formatDateLines(item.loan?.checkedInAt);
            return cellLines(time, date, styles.colCheckIn);
          })(),
          cellLines(
            formatNameOnly(item.loan?.returnedBy ?? undefined),
            formatStudentId(item.loan?.returnedBy ?? undefined),
            styles.colReturnedBy
          ),
          (() => {
            const { time, date } = formatDateLines(item.loan?.checkedOutAt);
            return cellLines(time, date, styles.colCheckOut);
          })()
        )
      )
    )
  );
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = reportFilterSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "INVALID_BODY", detail: parsed.error.flatten() },
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
    try {
      ensureFonts();
    } catch (fontError) {
      console.warn("[REPORT_EXPORT_FONT]", fontError);
    }
    const [totalReservations, statusGroups, typeGroups, items] =
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
        prisma.reservation.findMany({
          where,
          orderBy: { startAt: "desc" },
          take: 200,
          select: {
            id: true,
            type: true,
            status: true,
            startAt: true,
            endAt: true,
            room: { select: { roomNumber: true, floor: true } },
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
                key: { select: { keyCode: true } },
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

    const statusMap = new Map(
      statusGroups.map((item) => [item.status, getGroupCount(item)])
    );
    const typeMap = new Map(
      typeGroups.map((item) => [item.type, getGroupCount(item)])
    );

    const summary: Summary = {
      totalReservations,
      totalCompleted: statusMap.get("COMPLETED") ?? 0,
      totalCancelled: statusMap.get("CANCELLED") ?? 0,
      totalNoShow: statusMap.get("NO_SHOW") ?? 0,
      totalCheckedIn: statusMap.get("CHECKED_IN") ?? 0,
      breakdownByType: [
        { type: "IN_CLASS", count: typeMap.get("IN_CLASS") ?? 0 },
        { type: "AD_HOC", count: typeMap.get("AD_HOC") ?? 0 },
      ],
    };

    const doc = ReportDocument({
      dateRangeLabel: `${filters.dateFrom} to ${filters.dateTo}`,
      summary,
      items: items as PdfItem[],
    });
    const raw = await pdf(doc).toBuffer();
    const buffer = await toNodeBuffer(raw);
    const body = new Uint8Array(buffer);

    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"admin-report-${filters.dateFrom}-to-${filters.dateTo}.pdf\"`,
      },
    });
  } catch (error) {
    console.error("[REPORT_EXPORT_ERROR]", error);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : error instanceof Error
        ? error.message
        : String(error);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR", detail },
      { status: 500 }
    );
  }
}

