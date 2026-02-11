export type Mode = "CHECKIN" | "RETURN";

export type Room = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  floor: number;
  isBorrowed: boolean;
};

export type LookupSuccess = {
  ok: true;
  user: any;
  room: any;
  reservation: any;
  mode: Mode;
};

export type LookupFailure = {
  ok: false;
  message: string;
  detail?: any;
};

export type LookupResponse = LookupSuccess | LookupFailure;
