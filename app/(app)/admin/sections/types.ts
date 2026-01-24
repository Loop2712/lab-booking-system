export type Course = {
  id: string;
  code: string;
  name: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  roomNumber?: string | null;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role?: string;
};

export type Section = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  term?: string | null;
  year?: number | null;
  isActive: boolean;
  course: Course;
  room: Room;
  teacher: User;
  _count: { enrollments: number; reservations: number };
};
