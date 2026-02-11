import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isRole } from "@/lib/auth/session";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isAdmin = pathname.startsWith("/admin");
  const isTeacher = pathname.startsWith("/teacher");
  const isStudent = pathname.startsWith("/student");

  if (!isAdmin && !isTeacher && !isStudent) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = isRole(token?.role) ? token?.role : undefined;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  
  const isSettings = pathname.startsWith("/settings");
  if (!isAdmin && !isTeacher && !isStudent && !isSettings) return NextResponse.next();


  const forbidden = req.nextUrl.clone();
  forbidden.pathname = "/403";

  if (isAdmin && role !== "ADMIN") return NextResponse.redirect(forbidden);
  if (isTeacher && role !== "TEACHER") return NextResponse.redirect(forbidden);
  if (isStudent && role !== "STUDENT") return NextResponse.redirect(forbidden);

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
