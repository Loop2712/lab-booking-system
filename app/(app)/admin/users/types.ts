export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export type StudentType = "REGULAR" | "SPECIAL";

export type UserRow = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender | null;
  major: string | null;
  studentType: StudentType | null;
  studentId: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
};
