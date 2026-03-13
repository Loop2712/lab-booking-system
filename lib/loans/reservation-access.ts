import type { Prisma } from "@/app/generated/prisma/client";

type ReservationAccessAction = "CHECKIN" | "RETURN";

type ReservationAccessInput = {
  type: string;
  requesterId: string;
  sectionId?: string | null;
  participants?: Array<{ userId: string }>;
  loan?: {
    borrowerId?: string | null;
  } | null;
};

type ReservationAccessResult =
  | { ok: true; reason: "REQUESTER" | "PARTICIPANT" | "ENROLLED" | "BORROWER" }
  | { ok: false; message: "MISSING_SECTION" | "NOT_ALLOWED" };

export async function authorizeReservationActor(
  tx: Prisma.TransactionClient,
  {
    actorId,
    action,
    reservation,
  }: {
    actorId: string;
    action: ReservationAccessAction;
    reservation: ReservationAccessInput;
  }
): Promise<ReservationAccessResult> {
  if (actorId === reservation.requesterId) {
    return { ok: true, reason: "REQUESTER" };
  }

  const borrowerId = reservation.loan?.borrowerId ?? null;

  if (action === "RETURN" && borrowerId && borrowerId === actorId) {
    return { ok: true, reason: "BORROWER" };
  }

  if (reservation.type === "IN_CLASS") {
    if (!reservation.sectionId) {
      return { ok: false, message: "MISSING_SECTION" };
    }

    if (action === "RETURN" && borrowerId) {
      return { ok: false, message: "NOT_ALLOWED" };
    }

    const enrolled = await tx.enrollment.findFirst({
      where: {
        sectionId: reservation.sectionId,
        studentId: actorId,
      },
      select: { id: true },
    });

    return enrolled ? { ok: true, reason: "ENROLLED" } : { ok: false, message: "NOT_ALLOWED" };
  }

  const isParticipant = reservation.participants?.some((participant) => participant.userId === actorId) ?? false;
  return isParticipant ? { ok: true, reason: "PARTICIPANT" } : { ok: false, message: "NOT_ALLOWED" };
}
