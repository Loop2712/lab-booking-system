import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const schema = z
  .object({
    currentPassword: z.string().min(8), // รองรับอย่างน้อย 8 ตัว (ตอนนี้เราใช้ YYYYMMDD)
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const uid = (session as any)?.uid as string | undefined;
    if (!uid) {
      return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, passwordHash: true, birthDate: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
    }

    // currentPassword ต้องถูกต้อง
    let currentOk = false;

    if (user.passwordHash) {
      currentOk = await bcrypt.compare(body.currentPassword, user.passwordHash);
    } else {
      // fallback เฉพาะช่วง migrate: เทียบวันเกิด YYYYMMDD
      const yyyy = user.birthDate.getUTCFullYear();
      const mm = String(user.birthDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(user.birthDate.getUTCDate()).padStart(2, "0");
      const yyyymmdd = `${yyyy}${mm}${dd}`;
      currentOk = body.currentPassword === yyyymmdd;
    }

    if (!currentOk) {
      return NextResponse.json({ ok: false, message: "INVALID_CURRENT_PASSWORD" }, { status: 400 });
    }

    // กันตั้งรหัสใหม่ซ้ำกับเดิมแบบง่าย ๆ
    if (body.currentPassword === body.newPassword) {
      return NextResponse.json(
        { ok: false, message: "NEW_PASSWORD_SAME_AS_OLD" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(body.newPassword, 10);

    await prisma.user.update({
      where: { id: uid },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // zod error
    if (e?.issues) {
      return NextResponse.json({ ok: false, message: "VALIDATION_ERROR", details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: e?.message ?? "ERROR" }, { status: 500 });
  }
}
