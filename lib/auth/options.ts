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
  // NextAuth v4 req เป็น NextRequest-ish ที่มี headers.get
  const xf = req?.headers?.get?.("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const realIp = req?.headers?.get?.("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

const baseCreds = z.object({
  loginType: z.enum(["STUDENT", "STAFF"]),
  birthDate: z.string().regex(/^\d{8}$/), // YYYYMMDD
});

const studentCreds = baseCreds.extend({
  loginType: z.literal("STUDENT"),
  studentId: z.string().length(11),
});

const staffCreds = baseCreds.extend({
  loginType: z.literal("STAFF"),
  email: z.string().email(),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        loginType: { label: "loginType", type: "text" },
        studentId: { label: "studentId", type: "text" },
        email: { label: "email", type: "text" },
        birthDate: { label: "birthDate", type: "password" }, // เราใช้เป็น "รหัสผ่าน YYYYMMDD"
      },

      async authorize(raw, req) {
        // 1) Rate limit (Upstash)
        const ip = getIp(req);
        const ident = `${raw?.loginType ?? "?"}:${raw?.studentId ?? raw?.email ?? "?"}`;
        const key = `login:${ip}:${ident}`;

        const rl = await loginRatelimit.limit(key);
        if (!rl.success) {
          // ให้ NextAuth มองเป็น error
          throw new Error("RATE_LIMITED");
        }

        // 2) Student
        if (raw?.loginType === "STUDENT") {
          const c = studentCreds.parse(raw);

          const user = await prisma.user.findUnique({
            where: { studentId: c.studentId },
            select: {
              id: true,
              isActive: true,
              role: true,
              firstName: true,
              lastName: true,
              birthDate: true,
              studentId: true,
              passwordHash: true,
            },
          });

          if (!user || user.role !== "STUDENT") return null;

          // รองรับทั้งแบบใหม่ (passwordHash) และ fallback แบบเดิม (เทียบวันเกิด) ชั่วคราว
          const ok =
            user.passwordHash
              ? await bcrypt.compare(c.birthDate, user.passwordHash)
              : toYYYYMMDD(user.birthDate) === c.birthDate;

          if (!ok) return null;

          // ถ้ายังไม่มี passwordHash ให้ set ครั้งแรก (ช่วยย้ายระบบไปแบบปลอดภัย)
          if (!user.passwordHash) {
            const hash = await bcrypt.hash(c.birthDate, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hash },
            });
          }

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

        if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) return null;

        const ok =
          user.passwordHash
            ? await bcrypt.compare(c.birthDate, user.passwordHash)
            : toYYYYMMDD(user.birthDate) === c.birthDate;

        if (!ok) return null;

        if (!user.passwordHash) {
          const hash = await bcrypt.hash(c.birthDate, 10);
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

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.role = (user as any).role as Role;
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
