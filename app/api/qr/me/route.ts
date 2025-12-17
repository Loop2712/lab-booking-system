import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { makeUserQrToken } from "@/lib/security/user-qr";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = (session as any)?.uid as string | undefined;

  if (!uid) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const token = makeUserQrToken(uid);
  return NextResponse.json({ ok: true, token });
}
