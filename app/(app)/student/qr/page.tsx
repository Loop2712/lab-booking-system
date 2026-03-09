"use client";

import Link from "next/link";
import MyQrToken from "@/components/qr/MyQrToken";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";

export default function StudentQrPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">QR Token ของฉัน</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          แสดง QR Code หรือ Token นี้ให้เจ้าหน้าที่สแกน/คัดลอก เพื่อระบุตัวตนเมื่อยืม-คืนกุญแจ
        </p>
      </div>

      <MyQrToken />

      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/50 to-muted/30 p-5 ring-1 ring-black/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-background/80 p-2.5 shadow-sm ring-1 ring-black/5">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">ไปที่จุดยืม-คืนกุญแจ?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                เปิดหน้า “ยืม-คืนกุญแจ” เพื่อแสดงเฉพาะ QR Code ให้สแกนได้สะดวก
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 gap-2" variant="secondary">
            <Link href="/student/check">
              เปิดหน้า QR
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
