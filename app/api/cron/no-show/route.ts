import { NextResponse } from "next/server";
import { markNoShowReservations } from "@/lib/jobs/noShow";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authHeader = req.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const count = await markNoShowReservations();
  return NextResponse.json({ ok: true, count });
}
