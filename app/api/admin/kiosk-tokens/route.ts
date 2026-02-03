import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 15 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;

  const tokens = await prisma.kioskToken.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return NextResponse.json({ ok: true, tokens });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"], { requireUid: true });
  if (!guard.ok) return guard.response;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  const kioskToken = await prisma.kioskToken.create({
    data: {
      token,
      expiresAt,
      createdById: guard.uid,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return NextResponse.json({ ok: true, token: kioskToken });
}

