import { isValid, parseISO } from "date-fns";
import { formatDuration } from "@/lib/reports/format";

export const REPORT_TYPE_OPTIONS = ["ALL", "IN_CLASS", "AD_HOC"] as const;
export const REPORT_STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "NO_SHOW",
  "CHECKED_IN",
  "COMPLETED",
] as const;

const REPORT_TYPE_LABELS: Record<(typeof REPORT_TYPE_OPTIONS)[number], string> = {
  ALL: "ทุกประเภท",
  IN_CLASS: "ตารางเรียน",
  AD_HOC: "จองทั่วไป",
};

const REPORT_STATUS_LABELS: Record<
  (typeof REPORT_STATUS_OPTIONS)[number],
  string
> = {
  ALL: "ทุกสถานะ",
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิกแล้ว",
  NO_SHOW: "ไม่มาใช้งาน",
  CHECKED_IN: "เช็คอินแล้ว",
  COMPLETED: "เสร็จสิ้น",
};

const longDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;

  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function formatReportTypeLabel(value?: string | null) {
  if (!value) return "-";
  return REPORT_TYPE_LABELS[value as keyof typeof REPORT_TYPE_LABELS] ?? value;
}

export function formatReportStatusLabel(value?: string | null) {
  if (!value) return "-";
  return (
    REPORT_STATUS_LABELS[value as keyof typeof REPORT_STATUS_LABELS] ?? value
  );
}

export function formatReportDateLabel(
  value?: string | Date | null,
  fallback = "-"
) {
  const date = toDate(value);
  if (!date) return fallback;
  return longDateFormatter.format(date);
}

export function formatReportShortDateLabel(
  value?: string | Date | null,
  fallback = "-"
) {
  const date = toDate(value);
  if (!date) return fallback;
  return shortDateFormatter.format(date);
}

export function formatReportTimeLabel(
  value?: string | Date | null,
  fallback = "-"
) {
  const date = toDate(value);
  if (!date) return fallback;
  return timeFormatter.format(date);
}

export function formatReportDateTimeLabel(
  value?: string | Date | null,
  fallback = "-"
) {
  const date = toDate(value);
  if (!date) return fallback;
  return dateTimeFormatter.format(date);
}

export function formatReportTimeRangeLabel(
  start?: string | Date | null,
  end?: string | Date | null,
  fallback = "-"
) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return fallback;
  return `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
}

export function formatReportDurationLabel(
  start?: string | Date | null,
  end?: string | Date | null
) {
  return formatDuration(start, end);
}

export function formatReportDateRangeLabel(dateFrom: string, dateTo: string) {
  const startLabel = formatReportDateLabel(dateFrom, dateFrom);
  const endLabel = formatReportDateLabel(dateTo, dateTo);
  return dateFrom === dateTo ? startLabel : `${startLabel} - ${endLabel}`;
}
