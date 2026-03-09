"use client";

import MyQrToken from "@/components/qr/MyQrToken";

export default function StudentCheckPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ยืม-คืนกุญแจ</h1>
          <p className="text-sm text-muted-foreground">
            แสดง QR Code นี้ให้เจ้าหน้าที่หรืออาจารย์สแกนที่จุดยืม-คืนกุญแจ
          </p>
        </div>

        <MyQrToken checkOnly />
      </div>
    </div>
  );
}
