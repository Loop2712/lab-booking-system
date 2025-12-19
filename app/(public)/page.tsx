import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Lab Key Booking System</h1>
          <p className="text-muted-foreground">
            ระบบยืม–คืนกุญแจห้องปฏิบัติการคอมพิวเตอร์
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>เช็คห้องว่างวันนี้</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                ดูสถานะห้องแบบเรียลไทม์ (ไม่ต้องล็อกอิน)
              </p>
              <Button asChild className="w-full">
                <Link href="/rooms-today">เปิด Rooms Today</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>เข้าสู่ระบบ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                สำหรับนักศึกษา / อาจารย์ / เจ้าหน้าที่
              </p>
              <Button asChild className="w-full">
                <Link href="/login">ไปหน้า Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
