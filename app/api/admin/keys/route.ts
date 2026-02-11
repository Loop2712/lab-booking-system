import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const createKeySchema = z.object({
  keyCode: z.string().min(1),
  roomId: z.string().min(1),
  status: z.enum(["AVAILABLE", "BORROWED", "LOST", "DAMAGED"]).optional().default("AVAILABLE"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const keys = await prisma.key.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      room: true,
      loans: {
        where: { checkedOutAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  const payload = keys.map(({ loans, ...k }) => ({
    ...k,
    currentHolder: loans[0]?.borrower ?? null,
  }));

  return NextResponse.json({ ok: true, keys: payload });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const parsed = createKeySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "BAD_BODY", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    const key = await prisma.key.create({ data: body });
    return NextResponse.json({ ok: true, key });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "CREATE_FAILED", detail: e?.message },
      { status: 400 }
    );
  }
}
