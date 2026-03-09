import type { DayOfWeek, ReservationStatus, ReservationType } from "@/app/generated/prisma/enums";

export type StudentCalendarSection = {
  id: string;
  dayOfWeek: DayOfWeek | string;
  startTime: string;
  endTime: string;
  course: {
    code: string;
    name: string;
  };
  room: {
    code: string;
  };
  teacher: {
    firstName: string;
    lastName: string;
    email?: string | null;
  };
};

export type StudentReservationBase = {
  id: string;
  date: string | Date;
  slot: string;
  status: ReservationStatus | string;
  room: {
    code: string;
  };
};

export type StudentAdhocReservation = StudentReservationBase & {
  type: Extract<ReservationType, "AD_HOC"> | "AD_HOC";
};

export type StudentInClassReservation = StudentReservationBase & {
  type: Extract<ReservationType, "IN_CLASS"> | "IN_CLASS";
  section: {
    course: {
      code: string;
      name: string;
    };
    teacher: {
      firstName: string;
      lastName: string;
    };
  };
};

export type StudentCalendarApiResponse = {
  ok: boolean;
  sections: StudentCalendarSection[];
  reservations: {
    adhoc: StudentAdhocReservation[];
    inClass: StudentInClassReservation[];
  };
};

