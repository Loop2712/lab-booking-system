import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { makeUserQrToken, QR_TOKEN_TTL_SECONDS } from "@/lib/security/user-qr";
import { requireApiRole } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN", "TEACHER", "STUDENT"], { requireUid: true });
  if (!guard.ok) return guard.response;
  const uid = guard.uid;
  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const token = makeUserQrToken(uid, QR_TOKEN_TTL_SECONDS);
    return NextResponse.json({ ok: true, token });
  } catch (error) {
    console.error("[api/qr/me] failed to generate qr token:", error);
    return NextResponse.json({ ok: false, message: "QR_CONFIG_ERROR" }, { status: 503 });
  }
}
