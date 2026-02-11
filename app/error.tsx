"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">เกิดข้อผิดพลาด</h1>
        <p className="text-sm text-muted-foreground mt-2">
          ระบบพบข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>ลองใหม่</Button>
          <Button asChild variant="outline">
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
