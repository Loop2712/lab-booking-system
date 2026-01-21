import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRoleApi } from "@/lib/auth/guard";

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

  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

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

  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

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
