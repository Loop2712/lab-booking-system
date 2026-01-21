import { NextResponse } from "next/server";
import { makeUserQrToken } from "@/lib/security/user-qr";
import { requireRoleApi } from "@/lib/auth/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireRoleApi(["STUDENT", "TEACHER", "ADMIN"], { requireUid: true });
  if (!auth.ok) return auth.response;

  const token = makeUserQrToken(auth.uid);
  return NextResponse.json({ ok: true, token });
}
