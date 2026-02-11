import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
        <p className="text-sm text-muted-foreground mt-2">
          ลิงก์ที่คุณเปิดอาจถูกย้ายหรือไม่อยู่ในระบบแล้ว
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
