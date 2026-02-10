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
  isActive?: boolean;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  role?: string;
  isActive?: boolean;
};

export type Term = {
  id: string;
  term: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type Section = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  termId?: string | null;
  term?: Term | null;
  isActive: boolean;
  course: Course;
  room: Room;
  teacher: User;
  _count: { enrollments: number; reservations: number };
};
