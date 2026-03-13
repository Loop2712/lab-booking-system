export type Mode = "CHECKIN" | "RETURN";

export type Room = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  isBorrowed: boolean;
};

export type LookupUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string | null;
  email?: string | null;
};

export type LookupReservation = {
  id: string;
  type: string;
  status: string;
  slot: string;
  startAt: string;
  endAt: string;
  requesterId: string;
  room: {
    id: string;
    code: string;
    name: string;
    roomNumber: string;
    floor: number;
  };
};

export type LookupSuccess = {
  ok: true;
  user: LookupUser;
  room: LookupReservation["room"];
  reservation: LookupReservation;
  mode: Mode;
  candidatesCount: number;
};

export type LookupFailure = {
  ok: false;
  message: string;
  detail?: unknown;
};

export type LookupResponse = LookupSuccess | LookupFailure;
