export type Room = {
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
