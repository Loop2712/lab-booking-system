import type { ReservationStatus } from "@/app/generated/prisma/enums";

export type ReservationStatusInfo = {
  statusLabel: string;
  nextAction: string | null;
};

export function getReservationStatusInfo(
  status: ReservationStatus | string
): ReservationStatusInfo {
  switch (status) {
    case "PENDING":
      return { statusLabel: "รออนุมัติ", nextAction: "รออาจารย์/เจ้าหน้าที่อนุมัติ" };
    case "APPROVED":
      return { statusLabel: "อนุมัติแล้ว", nextAction: "ถึงเวลาไปรับกุญแจที่จุดยืม-คืน" };
    case "CHECKED_IN":
      return { statusLabel: "ยืมกุญแจแล้ว", nextAction: "คืนกุญแจเมื่อเสร็จการใช้งาน" };
    case "COMPLETED":
      return { statusLabel: "คืนกุญแจแล้ว", nextAction: null };
    case "REJECTED":
      return { statusLabel: "ไม่อนุมัติ", nextAction: "จองใหม่ในช่วงเวลาที่ว่าง" };
    case "CANCELLED":
      return { statusLabel: "ยกเลิกแล้ว", nextAction: "จองใหม่หากต้องการใช้งาน" };
    case "NO_SHOW":
      return { statusLabel: "ไม่มารับกุญแจ", nextAction: "จองใหม่และมารับกุญแจให้ทันเวลา" };
    default:
      return { statusLabel: String(status), nextAction: null };
  }
}

export function getReservationStatusLabel(status: ReservationStatus | string) {
  return getReservationStatusInfo(status).statusLabel;
}

export function getReservationNextAction(status: ReservationStatus | string) {
  return getReservationStatusInfo(status).nextAction;
}
