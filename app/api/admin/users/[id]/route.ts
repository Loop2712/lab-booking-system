import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const roleEnum = z.enum(["ADMIN", "TEACHER", "STUDENT"]);
const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
const studentTypeEnum = z.enum(["REGULAR", "SPECIAL"]);

const patchUserSchema = z.object({
  role: roleEnum.optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  gender: genderEnum.optional().nullable(),
  major: z.string().optional().nullable(),
  studentType: studentTypeEnum.optional().nullable(),

  studentId: z.string().length(11).optional().nullable(),
  email: z.string().email().optional().nullable(),

  passwordHash: z.string().optional().nullable(),

  // ⭐ สำคัญ
  isActive: z.coerce.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const json = await req.json().catch(() => null);
  const parsed = patchUserSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const data: any = { ...parsed.data };

    if (data.birthDate) {
      data.birthDate = new Date(`${data.birthDate}T00:00:00.000Z`);
    }

    // enforce role rules
    if (data.role === "STUDENT") {
      data.email = null;
    }
    if (data.role === "TEACHER" || data.role === "ADMIN") {
      data.studentId = null;
    }

    // ✅ ถ้าแก้ studentId (หรือกำหนด role เป็น STUDENT) ให้ตั้งรหัสผ่านเริ่มต้น = studentId
    // หมายเหตุ: ถ้ามีการส่ง passwordHash มาเอง จะเคารพค่าที่ส่งมา
    if (!("passwordHash" in data)) {
      const shouldSetByStudentId =
        typeof data.studentId === "string" &&
        data.studentId.length === 11 &&
        (data.role === "STUDENT" || data.role === undefined);

      if (shouldSetByStudentId) {
        data.passwordHash = await bcrypt.hash(data.studentId, 10);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    console.error("UPDATE USER FAILED:", e);
    return NextResponse.json(
      { ok: false, message: "UPDATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DEACTIVATE USER FAILED:", e);
    return NextResponse.json(
      { ok: false, message: "DEACTIVATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
