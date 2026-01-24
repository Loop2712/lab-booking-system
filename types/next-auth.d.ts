import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: "ADMIN" | "TEACHER" | "STUDENT";
    studentId?: string | null;
  }

  interface Session {
    uid?: string;
    role?: "ADMIN" | "TEACHER" | "STUDENT";
    studentId?: string | null;
  }
}
