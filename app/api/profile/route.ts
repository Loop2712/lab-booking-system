import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const patchSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: genderEnum.optional().nullable(),
  major: z.string().optional().nullable(),
});

function toYmdUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN", "TEACHER", "STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      major: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: toYmdUTC(user.birthDate),
      gender: user.gender,
      major: user.major,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN", "TEACHER", "STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_REQUEST", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data: Record<string, any> = { ...parsed.data };
  if ("major" in data && typeof data.major === "string" && data.major.trim() === "") {
    data.major = null;
  }
  if ("gender" in data && data.gender === "") {
    data.gender = null;
  }
  if (data.birthDate) {
    data.birthDate = new Date(`${data.birthDate}T00:00:00.000Z`);
  }

  const user = await prisma.user.update({
    where: { id: uid },
    data,
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      gender: true,
      major: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: toYmdUTC(user.birthDate),
      gender: user.gender,
      major: user.major,
    },
  });
}
