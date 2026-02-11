import type { TimelineRoomRow } from "@/components/rooms/rooms-timeline-table";

export type RangeItem = {
  reservationId: string;
  slot: string;
  type: "IN_CLASS" | "AD_HOC";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "NO_SHOW" | "CHECKED_IN" | "COMPLETED";
  requesterLabel?: string | null;
  borrowerLabel?: string | null;
  courseLabel?: string | null;
  startAt: string;
  endAt: string;
};

export type RoomsTodayPayload = {
  ok: boolean;
  date: string;
  rooms: TimelineRoomRow[];
};
