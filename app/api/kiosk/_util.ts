import { NextResponse } from "next/server";

export function requireScannerKey(req: Request) {
  const expected = process.env.SCANNER_KIOSK_KEY;
  if (!expected) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "SCANNER_KIOSK_KEY_MISSING" }, { status: 500 }) };
  }

  const got = req.headers.get("x-scanner-key") || "";
  if (!got || got !== expected) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "SCANNER_KEY_INVALID" }, { status: 401 }) };
  }

  return { ok: true as const };
}
