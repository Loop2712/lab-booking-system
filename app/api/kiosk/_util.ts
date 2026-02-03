import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function requireScannerKey(req: Request) {
  const got = req.headers.get("x-scanner-key") || "";
  if (!got) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "SCANNER_KEY_INVALID" }, { status: 401 }) };
  }

  const expected = process.env.SCANNER_KIOSK_KEY;
  if (expected && got === expected) {
    return { ok: true as const };
  }

  const token = await prisma.kioskToken.findFirst({
    where: {
      token: got,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!token) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "SCANNER_KEY_INVALID" }, { status: 401 }) };
  }

  return { ok: true as const };
}
