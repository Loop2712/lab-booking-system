import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const NOT_ALLOWED_PATH = "/not-allowed";
const COOKIE_PRIMARY = "kiosk_device";
const COOKIE_ALT = "Kiosk_Token";

export async function requireKioskDevice(mode: "api" | "page" = "api") {
  const store = await cookies();
  const deviceId = store.get(COOKIE_PRIMARY)?.value ?? store.get(COOKIE_ALT)?.value;

  if (!deviceId) {
    if (mode === "page") redirect(NOT_ALLOWED_PATH);
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, message: "KIOSK_DEVICE_INVALID" }, { status: 401 }),
    };
  }

  const token = await prisma.kioskToken.findFirst({
    where: {
      token: deviceId,
      isActive: true,
      revokedAt: null,
    },
  });

  if (!token) {
    if (mode === "page") redirect(NOT_ALLOWED_PATH);
    return {
      ok: false as const,
      res: NextResponse.json({ ok: false, message: "KIOSK_DEVICE_INVALID" }, { status: 401 }),
    };
  }

  return { ok: true as const, token };
}
