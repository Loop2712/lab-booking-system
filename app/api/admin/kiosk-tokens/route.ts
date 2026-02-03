import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const tokens = await prisma.kioskToken.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, tokens });
}

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  let token = generateToken();

  for (let i = 0; i < 3; i += 1) {
    try {
      const kioskToken = await prisma.kioskToken.create({
        data: {
          token,
          isActive: false,
          pairedAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, token: kioskToken });
    } catch {
      token = generateToken();
    }
  }

  return NextResponse.json({ ok: false, message: "CREATE_TOKEN_FAILED" }, { status: 500 });
}

