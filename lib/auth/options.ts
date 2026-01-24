import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";
import { loginRatelimit } from "@/lib/security/ratelimit";

function toYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

type Role = User["role"];

type SessionWithUser = Session & {
  uid?: string;
  role?: Role;
  studentId?: string | null;
  user?: Session["user"] & { id?: string };
};

type TokenPayload = JWT & {
  role?: Role;
  studentId?: string | null;
  email?: string | null;
};

const studentCreds = z.object({
  studentId: z.string().regex(/^\d{11}$/),
  password: z.string().regex(/^\d{11}$/),
});

const staffCreds = z.object({
  email: z.string().email(),
  password: z.string().regex(/^\d{8}$/), // YYYYMMDD
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        studentId: { label: "studentId", type: "text" },
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },

      async authorize(raw, req) {
        if (!raw) return null;

        // ===== rate limit (ถ้า Upstash ไม่พร้อมให้ข้าม เพื่อไม่ให้ login พังใน dev) =====
        try {
          const ip =
            (req?.headers?.["x-forwarded-for"] as string | undefined)
              ?.split(",")[0]
              ?.trim() ||
            (req?.headers?.["x-real-ip"] as string | undefined) ||
            "unknown";

          const rl = await loginRatelimit.limit(ip);
          if (rl.success === false) return null;
        } catch (e) {
          console.warn("[auth] ratelimit skipped:", e);
        }

        // Decide which form is used by checking which identifier is present
        const hasStudentId = typeof raw.studentId === "string" && raw.studentId.trim() !== "";
        const hasEmail = typeof raw.email === "string" && raw.email.trim() !== "";

        // ===== STUDENT =====
        if (hasStudentId) {
          const c = studentCreds.safeParse({
            studentId: String(raw.studentId).trim(),
            password: String(raw.password ?? "").trim(),
          });
          if (!c.success) return null;

          // policy: student password must equal studentId
          if (c.data.password !== c.data.studentId) return null;

          const user = await prisma.user.findFirst({
            where: {
              role: "STUDENT",
              studentId: c.data.studentId,
              isActive: true,
            },
          });
          if (!user) return null;

          let passwordHash = user.passwordHash ?? null;

          // migrate old records (or fresh seed) to the new rule: hash(studentId)
          if (!passwordHash) {
            passwordHash = await bcrypt.hash(c.data.studentId, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash },
            });
          }

          const ok = await bcrypt.compare(c.data.password, passwordHash);
          if (!ok) {
            // If data was seeded with an older rule (e.g. birthDate), migrate to the new rule.
            const newHash = await bcrypt.hash(c.data.studentId, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash },
            });
            const ok2 = await bcrypt.compare(c.data.password, newHash);
            if (!ok2) return null;
          }

          const sessionUser = {
            id: user.id,
            role: user.role as Role,
            studentId: user.studentId,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
          return sessionUser;
        }

        // ===== STAFF (Teacher/Admin) =====
        if (hasEmail) {
          const c = staffCreds.safeParse({
            email: String(raw.email).trim().toLowerCase(),
            password: String(raw.password ?? ""),
          });
          if (!c.success) return null;

          const user = await prisma.user.findFirst({
            where: {
              email: c.data.email,
              role: { in: ["TEACHER", "ADMIN"] },
              isActive: true,
            },
          });
          if (!user) return null;

          // Prefer passwordHash if present, otherwise fallback to birthDate YYYYMMDD
          if (user.passwordHash) {
            const ok = await bcrypt.compare(c.data.password, user.passwordHash);
            if (!ok) {
              // fallback to legacy rule (birthDate) in case seed used it but hash mismatch
              const expected = toYYYYMMDD(user.birthDate);
              if (c.data.password !== expected) return null;

              const hash = await bcrypt.hash(c.data.password, 10);
              await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hash },
              });
            }
          } else {
            const expected = toYYYYMMDD(user.birthDate);
            if (c.data.password !== expected) return null;

            // migrate: store hash for faster auth next time
            const hash = await bcrypt.hash(c.data.password, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hash },
            });
          }

          const sessionUser = {
            id: user.id,
            role: user.role as Role,
            studentId: user.studentId,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
          return sessionUser;
        }

        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const currentUser = user as User & { studentId?: string | null };
        token.role = currentUser.role;
        token.studentId = currentUser.studentId ?? null;
        token.email = currentUser.email ?? null;
        token.sub = currentUser.id;
      }
      return token as TokenPayload;
    },

    async session({ session, token }) {
      const currentSession = session as SessionWithUser;
      const currentToken = token as TokenPayload;
      currentSession.role = currentToken.role;
      currentSession.studentId = currentToken.studentId;

      const sessionUser = currentSession.user;
      if (sessionUser) {
        sessionUser.email = currentToken.email ?? sessionUser.email;
        currentSession.uid = currentToken.sub ?? sessionUser.id;
      }
      return currentSession;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
