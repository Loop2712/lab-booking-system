export type RoomBasic = {
  id: string;
  roomNumber: string;
  floor: number;
  computerCount: number;
  code?: string;
  name?: string;
};

export type AdminRoom = {
  id: string;
  roomNumber: string;
  floor: number;
  computerCount: number;
  code: string;
  name: string;
  isActive: boolean;
  _count?: { keys: number };
  currentHolder?: {
    id: string;
    firstName: string;
    lastName: string;
    studentId?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

export type AvailabilitySlot = {
  id: string;
  label: string;
  start: string;
  end: string;
  available: boolean;
  reason?: string | null;
};

export type RoomsAvailabilityResponse = {
  ok: boolean;
  slots: AvailabilitySlot[];
  limits: { maxSlots: number; mustConsecutive: boolean };
};

export type AdminRoomCreatePayload = {
  roomNumber: string;
  floor: number;
  computerCount: number;
  code: string;
  name: string;
  isActive?: boolean;
};
