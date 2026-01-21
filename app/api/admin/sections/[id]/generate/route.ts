import { NextResponse } from "next/server";
import { z } from "zod";
import { generateInClassReservations } from "@/lib/inclass/generate";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // ✅ สำคัญมาก

  const auth = await requireRoleApi(["ADMIN"]);
  if (!auth.ok) return auth.response;

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
  }

  const result = await generateInClassReservations({
    sectionId: id, // ✅ ใช้ id ที่ await แล้ว
    from: body.data.from,
    to: body.data.to,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
