import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { generateInClassReservations } from "@/lib/inclass/generate";

export const runtime = "nodejs";

function isAdmin(role?: string) {
  return role === "ADMIN";
}

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;
  if (!isAdmin(role)) return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });

  const body = bodySchema.parse(await req.json());
  const result = await generateInClassReservations({
    sectionId: ctx.params.id,
    from: body.from,
    to: body.to,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
