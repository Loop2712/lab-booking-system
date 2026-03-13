import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(1),
});

const COOKIE_PRIMARY = "kiosk_device";
const COOKIE_ALT = "Kiosk_Token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function generateDeviceId() {
  return crypto.randomBytes(32).toString("hex");
}

function attachCookies(res: NextResponse, token: string) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };

  res.cookies.set({ name: COOKIE_PRIMARY, value: token, ...options });
  res.cookies.set({ name: COOKIE_ALT, value: token, ...options });
}

function clearCookies(res: NextResponse) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  res.cookies.set({ name: COOKIE_PRIMARY, value: "", ...options });
  res.cookies.set({ name: COOKIE_ALT, value: "", ...options });
}

async function getCurrentDeviceToken(req: NextRequest) {
  const value = req.cookies.get(COOKIE_PRIMARY)?.value ?? req.cookies.get(COOKIE_ALT)?.value;
  if (!value) return null;

  return prisma.kioskToken.findFirst({
    where: {
      token: value,
      isActive: true,
      revokedAt: null,
    },
    select: {
      id: true,
      token: true,
      pairedAt: true,
      createdAt: true,
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const token = await getCurrentDeviceToken(req);
  if (token) {
    return NextResponse.json({
      ok: true,
      paired: true,
      token: token.token,
      pairedAt: token.pairedAt,
      createdAt: token.createdAt,
    });
  }

  const hasCookie = req.cookies.has(COOKIE_PRIMARY) || req.cookies.has(COOKIE_ALT);
  const res = NextResponse.json({ ok: true, paired: false });
  if (hasCookie) {
    clearCookies(res);
  }
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const guard = requireApiRole(session, ["ADMIN"]);
    if (!guard.ok) return guard.response;

    const body = bodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ ok: false, message: "BAD_BODY", detail: body.error.flatten() }, { status: 400 });
    }

    const currentDeviceToken = await getCurrentDeviceToken(req);
    if (currentDeviceToken) {
      return NextResponse.json({ ok: false, message: "ALREADY_PAIRED" }, { status: 409 });
    }

    const inputCode = body.data.code.trim();
    const existingToken = await prisma.kioskToken.findUnique({ where: { token: inputCode } });

    if (existingToken) {
      if (existingToken.revokedAt) {
        return NextResponse.json({ ok: false, message: "TOKEN_REVOKED" }, { status: 403 });
      }
      if (existingToken.isActive) {
        return NextResponse.json({ ok: false, message: "TOKEN_ALREADY_ACTIVE" }, { status: 409 });
      }

      const updated = await prisma.kioskToken.update({
        where: { id: existingToken.id },
        data: { isActive: true, pairedAt: new Date(), revokedAt: null },
      });

      const res = NextResponse.json({ ok: true, token: updated.token, pairedAt: updated.pairedAt });
      attachCookies(res, updated.token);
      return res;
    }

    const pairCode = process.env.KIOSK_PAIR_CODE;
    if (pairCode && inputCode !== pairCode) {
      return NextResponse.json({ ok: false, message: "PAIR_CODE_INVALID" }, { status: 401 });
    }

    const deviceId = generateDeviceId();
    const kioskToken = await prisma.kioskToken.create({
      data: {
        token: deviceId,
        isActive: true,
        pairedAt: new Date(),
      },
    });

    const res = NextResponse.json({ ok: true, token: kioskToken.token, pairedAt: kioskToken.pairedAt });
    attachCookies(res, kioskToken.token);
    return res;
  } catch (e: any) {
    console.error("KIOSK_PAIR_ERROR:", e);
    return NextResponse.json({ ok: false, message: "PAIR_FAILED", detail: e?.message }, { status: 500 });
  }
}
