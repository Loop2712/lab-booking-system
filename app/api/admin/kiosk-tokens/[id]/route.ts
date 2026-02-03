import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, message: "BAD_ID" }, { status: 400 });
  }

  try {
    const token = await prisma.kioskToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "NOT_FOUND", detail: e?.message },
      { status: 404 }
    );
  }
}

