import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import bcrypt from "bcrypt";
import { loginRatelimit } from "@/lib/security/ratelimit";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

function toYYYYMMDD(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getIp(req: any) {
  const xff = req?.headers?.get?.("x-forwarded-for");
  if (xff) return String(xff).split(",")[0]?.trim() ?? "unknown";
  const realIp = req?.headers?.get?.("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

const studentCreds = z.object({
  loginType: z.literal("STUDENT"),
  studentId: z.string().regex(/^\d{11}$/),
  password: z.string().regex(/^\d{11}$/),
});

const staffCreds = z.object({
  loginType: z.literal("STAFF"),
  email: z.string().email(),
  password: z.string().regex(/^\d{8}$/), // YYYYMMDD
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        loginType: { label: "loginType", type: "text" },
        studentId: { label: "studentId", type: "text" },
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },

      async authorize(raw, req) {        // 1) Rate limit (Upstash)
        // NOTE: In dev or when Upstash is misconfigured, we should NOT block login.
        const ip = getIp(req);
        const ident = `${raw?.loginType ?? "?"}:${raw?.studentId ?? raw?.email ?? "?"}`;
        const key = `login:${ip}:${ident}`;

        try {
          const rl = await loginRatelimit.limit(key as any);
          if (!rl.success) {
            // ให้ NextAuth มองเป็น error (แสดงข้อความบน /login)
            throw new Error("RATE_LIMITED");
          }
        } catch (e) {
          // ถ้า ratelimit ใช้งานไม่ได้ (env ผิด/เน็ต/Upstash ล่ม) ให้ข้ามไป (dev-friendly)
          // eslint-disable-next-line no-console
          console.warn("[auth] ratelimit skipped:", (e as any)?.message ?? e);
        }

        // 2) Student
        if (raw?.loginType === "STUDENT") {
          const c = studentCreds.parse(raw);

          // policy: student password = studentId
          if (c.password !== c.studentId) return null;

          const user = await prisma.user.findUnique({
            where: { studentId: c.studentId },
            select: {
              id: true,
              isActive: true,
              role: true,
              firstName: true,
              lastName: true,
              studentId: true,
              passwordHash: true,
            },
          });

          if (!user || user.role !== "STUDENT") return null;
          if (user.isActive === false) return null;

          // ถ้ายังไม่มี passwordHash ให้ set เป็น hash(studentId) เพื่อ migrate ของเดิม
          let passwordHash = user.passwordHash;
          if (!passwordHash) {
            const hash = await bcrypt.hash(c.studentId, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hash },
            });
            passwordHash = hash;
          }

          const ok = await bcrypt.compare(c.password, passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            role: user.role,
            name: `${user.firstName} ${user.lastName}`,
            studentId: user.studentId,
          } as any;
        }

        // 3) Staff (Teacher/Admin)
        const c = staffCreds.parse(raw);

        const user = await prisma.user.findUnique({
          where: { email: c.email },
          select: {
            id: true,
            isActive: true,
            role: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            email: true,
            passwordHash: true,
          },
        });

        if (!user) return null;
        if (user.isActive === false) return null;

        // staff login อนุญาตทั้ง TEACHER และ ADMIN
        if (user.role !== "TEACHER" && user.role !== "ADMIN") return null;

        const expected = toYYYYMMDD(user.birthDate);

        // รองรับทั้งแบบใหม่ (passwordHash) และ fallback แบบเดิม (เทียบวันเกิด) ชั่วคราว
        let ok: boolean;
        if (user.passwordHash) {
          ok = await bcrypt.compare(c.password, user.passwordHash);
        } else {
          ok = expected === c.password;
        }

        if (!ok) return null;

        // ถ้ายังไม่มี passwordHash ให้ set จาก expected เพื่อให้สอดคล้อง
        if (!user.passwordHash) {
          const hash = await bcrypt.hash(expected, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash },
          });
        }

        return {
          id: user.id,
          role: user.role,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        } as any;
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).uid = token.uid;
      (session as any).role = token.role;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
