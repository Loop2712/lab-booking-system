import { z } from "zod";
import { endOfDay, isValid, parseISO, startOfDay } from "date-fns";
import { Prisma } from "@/app/generated/prisma/client";
import type {
  ReservationStatus,
  ReservationType,
} from "@/app/generated/prisma/enums";

const dateString = z.string().min(1).refine((value) => {
  const parsed = parseISO(value);
  return isValid(parsed);
}, "INVALID_DATE");

const reservationType = z
  .enum(["IN_CLASS", "AD_HOC", "ALL"])
  .optional();

const reservationStatus = z
  .enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
    "NO_SHOW",
    "CHECKED_IN",
    "COMPLETED",
    "ALL",
  ])
  .optional();

export const reportFilterSchema = z.object({
  dateFrom: dateString,
  dateTo: dateString,
  type: reservationType,
  status: reservationStatus,
  roomId: z.string().optional(),
  room: z.string().optional(),
  keyId: z.string().optional(),
  key: z.string().optional(),
  requester: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

export type NormalizedReportFilters = {
  dateFrom: string;
  dateTo: string;
  type?: ReservationType;
  status?: ReservationStatus;
  roomId?: string;
  room?: string;
  keyId?: string;
  key?: string;
  requester?: string;
  page: number;
  pageSize: number;
};

function normalizeValue(value?: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "ALL") return undefined;
  return trimmed;
}

export function normalizeReportFilters(input: ReportFilterInput): NormalizedReportFilters {
  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    type: input.type === "ALL" ? undefined : input.type,
    status: input.status === "ALL" ? undefined : input.status,
    roomId: normalizeValue(input.roomId),
    room: normalizeValue(input.room),
    keyId: normalizeValue(input.keyId),
    key: normalizeValue(input.key),
    requester: normalizeValue(input.requester),
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 20,
  };
}

export function getReportDateRange(dateFrom: string, dateTo: string) {
  const from = startOfDay(parseISO(dateFrom));
  const to = endOfDay(parseISO(dateTo));
  if (!isValid(from) || !isValid(to)) return null;
  if (to < from) return null;
  return { from, to };
}

export function buildReservationWhere(
  filters: NormalizedReportFilters,
  range: { from: Date; to: Date }
): Prisma.ReservationWhereInput {
  const where: Prisma.ReservationWhereInput = {
    startAt: { lte: range.to },
    endAt: { gte: range.from },
  };

  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.roomId) where.roomId = filters.roomId;

  if (filters.room) {
    const floorValue = Number(filters.room);
    const orConditions: Prisma.RoomWhereInput[] = [
      {
        roomNumber: { contains: filters.room, mode: "insensitive" },
      },
    ];
    if (Number.isFinite(floorValue) && Number.isInteger(floorValue)) {
      orConditions.push({ floor: floorValue });
    }
    where.room = { OR: orConditions };
  }

  if (filters.requester) {
    where.requester = {
      OR: [
        { studentId: { contains: filters.requester, mode: "insensitive" } },
        { email: { contains: filters.requester, mode: "insensitive" } },
        { firstName: { contains: filters.requester, mode: "insensitive" } },
        { lastName: { contains: filters.requester, mode: "insensitive" } },
      ],
    };
  }

  if (filters.keyId || filters.key) {
    const loanWhere: Prisma.LoanWhereInput = {};
    if (filters.keyId) {
      loanWhere.keyId = filters.keyId;
    }
    if (filters.key) {
      loanWhere.key = {
        keyCode: { contains: filters.key, mode: "insensitive" },
      };
    }
    where.loan = { is: loanWhere };
  }

  return where;
}
