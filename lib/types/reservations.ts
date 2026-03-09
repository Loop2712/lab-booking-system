import type { ReservationStatus } from "@/app/generated/prisma/enums";

export type ReservationRoom = {
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
};

export type MyReservationItem = {
  id: string;
  type: string;
  status: ReservationStatus | string;
  statusLabel?: string;
  nextAction?: string | null;
  date: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  createdAt: string;
  room: ReservationRoom;
};

export type MyReservationsResponse = {
  ok: boolean;
  items: MyReservationItem[];
};
