export type Room = {
  id: string;
  roomNumber: string;
  floor: number;
  computerCount: number;
  code: string;
  name: string;
  isActive: boolean;
  _count?: { keys: number };
};
