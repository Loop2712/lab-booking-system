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

const patchSchema = z.object({
  keyCode: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  status: z.enum(["AVAILABLE", "BORROWED", "LOST", "DAMAGED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  const body = patchSchema.parse(await req.json());

  try {
    const key = await prisma.key.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json({ ok: true, key });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "UPDATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const denied = assertAdmin(session as any);
  if (denied) return denied;

  try {
    await prisma.key.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "DELETE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
