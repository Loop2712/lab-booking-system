import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardHref } from "./dashboardHref";


export default async function PublicHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  const isLoggedIn = !!session;

  const loginCardTitle = isLoggedIn ? "แดชบอร์ด" : "เข้าสู่ระบบ";
  const loginCardDesc = isLoggedIn
    ? "คุณได้เข้าสู่ระบบแล้ว สามารถไปที่แดชบอร์ดได้เลย"
    : "สำหรับนักศึกษา / อาจารย์ / เจ้าหน้าที่";

  const buttonHref = isLoggedIn ? dashboardHref(role) : "/login";
  const buttonText = isLoggedIn ? "ไปหน้าแดชบอร์ด" : "ไปหน้า Login";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Lab Key Booking System</h1>
          <p className="text-muted-foreground">
            Borrow–ReturnKeyRoom
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                สถานะห้อง (วันนี้)
              </p>
              <Button asChild className="w-full">
                <Link href="/rooms-today">ดูสถานะห้องวันนี้</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{loginCardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{loginCardDesc}</p>
              <Button asChild className="w-full">
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
