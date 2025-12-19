import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

function assertAdmin(session: any) {
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

const roleEnum = z.enum(["ADMIN", "TEACHER", "STUDENT"]);
const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
const studentTypeEnum = z.enum(["REGULAR", "SPECIAL"]);

const createUserSchema = z
  .object({
    role: roleEnum,
    firstName: z.string().min(1),
    lastName: z.string().min(1),

    // login ใช้ birthDate เป็นรหัส (YYYY-MM-DD)
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    gender: genderEnum.optional().nullable(),
    major: z.string().optional().nullable(),
    studentType: studentTypeEnum.optional().nullable(),

    studentId: z.string().length(11).optional().nullable(), // STUDENT only
    email: z.string().email().optional().nullable(), // TEACHER/ADMIN only

    // optional override (mostly for import)
    passwordHash: z.string().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "STUDENT") {
      if (!val.studentId) ctx.addIssue({ code: "custom", message: "studentId is required for STUDENT" });
      if (val.email) ctx.addIssue({ code: "custom", message: "email must be empty for STUDENT" });
    }
    if (val.role === "TEACHER" || val.role === "ADMIN") {
      if (!val.email) ctx.addIssue({ code: "custom", message: "email is required for TEACHER/ADMIN" });
      if (val.studentId) ctx.addIssue({ code: "custom", message: "studentId must be empty for TEACHER/ADMIN" });
    }
  });

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const activeParam = searchParams.get("active") || "1"; // default show active
  const activeFilter = activeParam === "all" ? undefined : activeParam === "1" ? true : false;

  const users = await prisma.user.findMany({
    where: {
      ...(activeFilter === undefined ? {} : { isActive: activeFilter }),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { studentId: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      major: true,
      studentType: true,
      studentId: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  const parsed = createUserSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;

  try {
    const birthDate = new Date(`${body.birthDate}T00:00:00.000Z`);

    const user = await prisma.user.create({
      data: {
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
        birthDate,
        gender: body.gender ?? null,
        major: body.major ?? null,
        studentType: body.studentType ?? null,
        studentId: body.studentId ?? null,
        email: body.email ?? null,
        passwordHash: body.passwordHash ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "CREATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
