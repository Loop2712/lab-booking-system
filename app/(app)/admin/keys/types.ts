export type Room = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export type KeyStatus = "AVAILABLE" | "BORROWED" | "LOST" | "DAMAGED";

export type KeyRow = {
  id: string;
  keyCode: string;
  status: KeyStatus;
  roomId: string;
  room?: Room;
};
