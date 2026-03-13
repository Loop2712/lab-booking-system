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
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import {
  buildReservationWhere,
  getReportDateRange,
  normalizeReportFilters,
  reportFilterSchema,
  type NormalizedReportFilters,
} from "@/lib/reports/filters";
import {
  formatReportDateLabel,
  formatReportDateRangeLabel,
  formatReportDateTimeLabel,
  formatReportDurationLabel,
  formatReportStatusLabel,
  formatReportTimeRangeLabel,
  formatReportTypeLabel,
} from "@/lib/reports/presentation";

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

  Font.register({
    family: "NotoSansThai",
    fonts: [
      {
        src: path.join(fontDir, "NotoSansThai-Regular.ttf"),
        fontWeight: "normal",
      },
      {
        src: path.join(fontDir, "NotoSansThai-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  });

  fontsReady = true;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 34,
    fontSize: 8.5,
    fontFamily: "NotoSansThai",
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: "Kanit",
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#4B5563",
    lineHeight: 1.5,
  },
  headerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaText: {
    fontSize: 8,
    color: "#4B5563",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Kanit",
    fontWeight: "bold",
    marginBottom: 6,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterBox: {
    width: "48.4%",
    marginRight: "3.2%",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  filterBoxLast: {
    marginRight: 0,
  },
  filterLabel: {
    fontSize: 7.2,
    color: "#6B7280",
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 8.5,
    color: "#111827",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  summaryBox: {
    width: "31.2%",
    marginRight: "3.2%",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryBoxLast: {
    marginRight: 0,
  },
  summaryLabel: {
    fontSize: 7.2,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: "Kanit",
    fontWeight: "bold",
    color: "#111827",
  },
  summaryNote: {
    fontSize: 7.2,
    color: "#6B7280",
    marginTop: 2,
  },
  noteBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 7.8,
    color: "#374151",
    lineHeight: 1.45,
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9CA3AF",
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableCell: {
    paddingRight: 8,
    flexBasis: 0,
  },
  colIndex: {
    flexGrow: 0.32,
  },
  colBooking: {
    flexGrow: 1.7,
  },
  colRequester: {
    flexGrow: 1.2,
  },
  colStatus: {
    flexGrow: 0.82,
  },
  colLoan: {
    flexGrow: 1.3,
    paddingRight: 0,
  },
  headText: {
    fontSize: 7.6,
    fontWeight: "bold",
  },
  cellPrimary: {
    fontSize: 8.3,
    color: "#111827",
  },
  cellStrong: {
    fontSize: 8.3,
    fontWeight: "bold",
    color: "#111827",
  },
  cellSecondary: {
    fontSize: 7.5,
    color: "#374151",
    marginTop: 2,
  },
  cellMuted: {
    fontSize: 7,
    color: "#6B7280",
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#6B7280",
  },
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
  room: {
    roomNumber: string;
    floor: number;
    code?: string | null;
    name?: string | null;
  };
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
  } | null;
};

type FilterItem = {
  label: string;
  value: string;
};

const h = React.createElement;

function getGroupCount(
  item: { _count?: boolean | { _all?: number | null } | null } | null
) {
  if (!item || !item._count || typeof item._count === "boolean") return 0;
  return item._count._all ?? 0;
}

function formatNameOnly(user?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  if (!user) return "-";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "-";
}

function formatIdentityLine(user?: {
  studentId?: string | null;
  email?: string | null;
  role?: string | null;
} | null) {
  if (!user) return "-";
  const parts = [user.studentId, user.email].filter(Boolean);
  if (parts.length > 0) return parts.join(" • ");
  return user.role ? `บทบาท ${user.role}` : "-";
}

function formatRoomTitle(room?: {
  roomNumber?: string | null;
  name?: string | null;
} | null) {
  const roomNumber = room?.roomNumber ? `ห้อง ${room.roomNumber}` : "ไม่พบห้อง";
  return room?.name ? `${roomNumber} • ${room.name}` : roomNumber;
}

function formatRoomMeta(room?: {
  floor?: number | null;
  code?: string | null;
} | null) {
  const parts = [
    room?.code ? `รหัส ${room.code}` : null,
    room?.floor !== null && room?.floor !== undefined ? `ชั้น ${room.floor}` : null,
  ].filter(Boolean);
  return parts.join(" • ") || "-";
}

function formatCourseLine(item: PdfItem) {
  const course = item.section?.course;
  if (!course) return "ไม่มีวิชาที่เชื่อมโยง";
  return [course.code, course.name].filter(Boolean).join(" • ") || "-";
}

function formatLoanLine(item: PdfItem) {
  const keyLine = item.loan?.key?.keyCode ? `กุญแจ ${item.loan.key.keyCode}` : "ไม่มีกุญแจ";
  const borrowerLine = formatNameOnly(item.loan?.borrower ?? undefined);
  const checkedInLine = item.loan?.checkedInAt
    ? `รับ ${formatReportDateTimeLabel(item.loan.checkedInAt)}`
    : "ยังไม่รับกุญแจ";
  const checkedOutLine = item.loan?.checkedOutAt
    ? `คืน ${formatReportDateTimeLabel(item.loan.checkedOutAt)}`
    : "ยังไม่คืนกุญแจ";

  return {
    keyLine,
    borrowerLine,
    checkedInLine,
    checkedOutLine,
  };
}

function buildAppliedFilters(
  filters: NormalizedReportFilters,
  roomLabel?: string,
  keyLabel?: string
) {
  const items: FilterItem[] = [
    {
      label: "ช่วงวันที่",
      value: formatReportDateRangeLabel(filters.dateFrom, filters.dateTo),
    },
  ];

  if (filters.type) {
    items.push({
      label: "ประเภท",
      value: formatReportTypeLabel(filters.type),
    });
  }

  if (filters.status) {
    items.push({
      label: "สถานะ",
      value: formatReportStatusLabel(filters.status),
    });
  }

  if (roomLabel) {
    items.push({ label: "ห้อง", value: roomLabel });
  } else if (filters.room) {
    items.push({ label: "ค้นหาห้อง", value: filters.room });
  }

  if (keyLabel) {
    items.push({ label: "กุญแจ", value: keyLabel });
  } else if (filters.key) {
    items.push({ label: "ค้นหากุญแจ", value: filters.key });
  }

  if (filters.requester) {
    items.push({ label: "ผู้จอง", value: filters.requester });
  }

  return items;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function toNodeBuffer(input: unknown): Promise<Buffer> {
  if (!input) return Buffer.alloc(0);
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  if (input instanceof Uint8Array) return Buffer.from(input);

  const maybeBlob = input as { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof maybeBlob.arrayBuffer === "function") {
    return Buffer.from(await maybeBlob.arrayBuffer());
  }

  const maybeNodeStream = input as {
    on?: (event: string, cb: (...args: unknown[]) => void) => void;
  };
  if (typeof maybeNodeStream.on === "function") {
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      maybeNodeStream.on?.("data", (...args: unknown[]) => {
        const chunk = args[0] as Buffer | Uint8Array;
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      maybeNodeStream.on?.("end", () => resolve(Buffer.concat(chunks)));
      maybeNodeStream.on?.("error", (...args: unknown[]) => {
        reject(args[0] as Error);
      });
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
  summary,
  items,
  filters,
  generatedAtLabel,
  exportLimitNote,
}: {
  summary: Summary;
  items: PdfItem[];
  filters: FilterItem[];
  generatedAtLabel: string;
  exportLimitNote?: string;
}) {
  const firstPageCount = 8;
  const nextPageCount = 14;
  const firstPageItems = items.slice(0, firstPageCount);
  const otherPages = chunkItems(items.slice(firstPageCount), nextPageCount);

  const footer = h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, { style: styles.footerText }, `สร้างเมื่อ ${generatedAtLabel}`),
    h(Text, {
      style: styles.footerText,
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `หน้า ${pageNumber} / ${totalPages}`,
    } as any)
  );

  const renderFilter = (item: FilterItem, index: number, array: FilterItem[]) =>
    h(
      View,
      {
        style: [
          styles.filterBox,
          index % 2 === 1 || index === array.length - 1 ? styles.filterBoxLast : null,
        ] as any,
        key: `${item.label}-${item.value}`,
      },
      h(Text, { style: styles.filterLabel }, item.label),
      h(Text, { style: styles.filterValue }, item.value)
    );

  const summaryItems = [
    {
      label: "รายการทั้งหมด",
      value: summary.totalReservations,
      note: "ตามตัวกรองปัจจุบัน",
    },
    {
      label: "เสร็จสิ้น",
      value: summary.totalCompleted,
      note: "ใช้งานสำเร็จแล้ว",
    },
    {
      label: "เช็คอินแล้ว",
      value: summary.totalCheckedIn,
      note: "อยู่ระหว่างใช้งาน",
    },
    {
      label: "ยกเลิก",
      value: summary.totalCancelled,
      note: "รายการที่ถูกยกเลิก",
    },
    {
      label: "No Show",
      value: summary.totalNoShow,
      note: "จองแต่ไม่มาใช้งาน",
    },
    {
      label: "ตารางเรียน / จองทั่วไป",
      value: `${summary.breakdownByType[0]?.count ?? 0} / ${
        summary.breakdownByType[1]?.count ?? 0
      }`,
      note: "IN_CLASS / AD_HOC",
    },
  ];

  const renderSummary = (
    item: { label: string; value: number | string; note: string },
    index: number,
    array: { label: string; value: number | string; note: string }[]
  ) =>
    h(
      View,
      {
        style: [
          styles.summaryBox,
          index % 3 === 2 || index === array.length - 1 ? styles.summaryBoxLast : null,
        ] as any,
        key: item.label,
      },
      h(Text, { style: styles.summaryLabel }, item.label),
      h(Text, { style: styles.summaryValue }, String(item.value)),
      h(Text, { style: styles.summaryNote }, item.note)
    );

  const renderCellText = (
    primary: string,
    secondary?: string,
    tertiary?: string,
    quaternary?: string,
    strong = false
  ) => [
    h(
      Text,
      { style: strong ? styles.cellStrong : styles.cellPrimary, key: "primary" },
      primary
    ),
    secondary ? h(Text, { style: styles.cellSecondary, key: "secondary" }, secondary) : null,
    tertiary ? h(Text, { style: styles.cellMuted, key: "tertiary" }, tertiary) : null,
    quaternary ? h(Text, { style: styles.cellMuted, key: "quaternary" }, quaternary) : null,
  ].filter(Boolean);

  const renderTableHeader = () =>
    h(
      View,
      { style: styles.tableHeader },
      h(Text, { style: [styles.tableCell, styles.colIndex, styles.headText] as any }, "#"),
      h(Text, { style: [styles.tableCell, styles.colBooking, styles.headText] as any }, "ห้อง / เวลา"),
      h(Text, { style: [styles.tableCell, styles.colRequester, styles.headText] as any }, "ผู้จอง"),
      h(Text, { style: [styles.tableCell, styles.colStatus, styles.headText] as any }, "สถานะ"),
      h(Text, { style: [styles.tableCell, styles.colLoan, styles.headText] as any }, "กุญแจ / การยืมคืน")
    );

  const renderRow = (item: PdfItem, rowIndex: number) => {
    const loan = formatLoanLine(item);

    return h(
      View,
      { style: styles.tableRow, wrap: false, key: item.id },
      h(
        View,
        { style: [styles.tableCell, styles.colIndex] as any },
        h(Text, { style: styles.cellPrimary }, String(rowIndex + 1))
      ),
      h(
        View,
        { style: [styles.tableCell, styles.colBooking] as any },
        ...renderCellText(
          formatRoomTitle(item.room),
          formatRoomMeta(item.room),
          `${formatReportTypeLabel(item.type)} • ${formatReportDateLabel(item.startAt)}`,
          `${formatReportTimeRangeLabel(item.startAt, item.endAt)} • ${formatReportDurationLabel(
            item.startAt,
            item.endAt
          )} • ${formatCourseLine(item)}`,
          true
        )
      ),
      h(
        View,
        { style: [styles.tableCell, styles.colRequester] as any },
        ...renderCellText(
          formatNameOnly(item.requester),
          formatIdentityLine(item.requester),
          undefined,
          undefined,
          true
        )
      ),
      h(
        View,
        { style: [styles.tableCell, styles.colStatus] as any },
        ...renderCellText(
          formatReportStatusLabel(item.status),
          `เริ่ม ${formatReportDateTimeLabel(item.startAt)}`,
          undefined,
          undefined,
          true
        )
      ),
      h(
        View,
        { style: [styles.tableCell, styles.colLoan] as any },
        ...renderCellText(
          loan.keyLine,
          loan.borrowerLine,
          loan.checkedInLine,
          loan.checkedOutLine,
          true
        )
      )
    );
  };

  const renderTableSection = (pageItems: PdfItem[], offset: number, title: string) =>
    h(
      View,
      { style: styles.section },
      h(Text, { style: styles.sectionTitle }, title),
      renderTableHeader(),
      ...(pageItems.length > 0
        ? pageItems.map((item, index) => renderRow(item, offset + index))
        : [
            h(
              View,
              { style: styles.tableRow, key: "empty" },
              h(
                View,
                { style: [styles.tableCell, styles.colBooking] as any },
                h(Text, { style: styles.cellSecondary }, "ไม่พบรายการจองตามตัวกรองนี้")
              )
            ),
          ])
    );

  const firstPage = h(
    Page,
    { size: "A4", style: styles.page },
    h(
      View,
      { style: styles.header },
      h(Text, { style: styles.title }, "รายงานการจองห้องและการยืมกุญแจ"),
      h(
        Text,
        { style: styles.subtitle },
        "เอกสารสรุปข้อมูลการจอง การรับกุญแจ และการคืนกุญแจตามตัวกรองที่กำหนด จัดรูปแบบเพื่อการอ่านและอ้างอิงอย่างเป็นทางการ"
      ),
      h(
        View,
        { style: styles.headerMeta },
        h(Text, { style: styles.metaText }, `ช่วงรายงาน: ${filters[0]?.value ?? "-"}`),
        h(Text, { style: styles.metaText }, `เวลาส่งออก: ${generatedAtLabel}`)
      )
    ),
    h(
      View,
      { style: styles.section },
      h(Text, { style: styles.sectionTitle }, "ตัวกรองที่ใช้"),
      h(View, { style: styles.filterGrid }, ...filters.map(renderFilter))
    ),
    h(
      View,
      { style: styles.section },
      h(Text, { style: styles.sectionTitle }, "สรุปข้อมูล"),
      h(View, { style: styles.summaryGrid }, ...summaryItems.map(renderSummary))
    ),
    exportLimitNote
      ? h(
          View,
          { style: styles.noteBox },
          h(Text, { style: styles.noteText }, exportLimitNote)
        )
      : null,
    renderTableSection(firstPageItems, 0, "รายการการจอง"),
    footer
  );

  const continuedPages = otherPages.map((pageItems, pageIndex) =>
    h(
      Page,
      { size: "A4", style: styles.page, key: `continued-${pageIndex + 2}` },
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.title }, "รายงานการจองห้องและการยืมกุญแจ"),
        h(
          Text,
          { style: styles.subtitle },
          `ต่อเนื่องจากหน้าแรก • ${filters[0]?.value ?? "-"}`
        )
      ),
      renderTableSection(pageItems, firstPageCount + pageIndex * nextPageCount, "รายการการจอง (ต่อ)"),
      footer
    )
  );

  return h(Document, null, firstPage, ...continuedPages);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
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

    const [selectedRoom, selectedKey] = await Promise.all([
      filters.roomId
        ? prisma.room.findUnique({
            where: { id: filters.roomId },
            select: {
              roomNumber: true,
              floor: true,
              name: true,
            },
          })
        : Promise.resolve(null),
      filters.keyId
        ? prisma.key.findUnique({
            where: { id: filters.keyId },
            select: {
              keyCode: true,
              room: {
                select: {
                  roomNumber: true,
                  floor: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

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

    const roomLabel = selectedRoom
      ? `${selectedRoom.roomNumber} • ชั้น ${selectedRoom.floor}${
          selectedRoom.name ? ` • ${selectedRoom.name}` : ""
        }`
      : undefined;
    const keyLabel = selectedKey
      ? `${selectedKey.keyCode}${
          selectedKey.room
            ? ` • ห้อง ${selectedKey.room.roomNumber} ชั้น ${selectedKey.room.floor}`
            : ""
        }`
      : undefined;

    const appliedFilters = buildAppliedFilters(filters, roomLabel, keyLabel);
    const exportLimitNote =
      totalReservations > items.length
        ? `รายงาน PDF นี้แสดง ${items.length} รายการล่าสุดจากทั้งหมด ${totalReservations} รายการ เพื่อคงความกระชับของเอกสารและความชัดเจนของข้อมูล`
        : undefined;

    const doc = ReportDocument({
      summary,
      items: items as PdfItem[],
      filters: appliedFilters,
      generatedAtLabel: formatReportDateTimeLabel(new Date()),
      exportLimitNote,
    });

    const raw = await pdf(doc).toBuffer();
    const buffer = await toNodeBuffer(raw);
    const responseBody = new Uint8Array(buffer);

    return new NextResponse(responseBody as unknown as BodyInit, {
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
