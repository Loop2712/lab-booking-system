import Link from "next/link";
import Image from "next/image";
import { Kanit } from "next/font/google";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guard";
import PairClient from "./pair-client";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "600", "700"],
});

export default async function KioskPairPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className={kanit.className}>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-emerald-50 text-black">
        <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Computer Lab Key Booking System"
                width={1536}
                height={1024}
                className="h-10 w-auto"
                priority
              />
            </div>

            <div className="flex items-center gap-4">
              <Button asChild variant="outline">
                <Link href="/admin/self-check">กลับหน้าจัดการ</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl px-6 py-12">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#6ABE75]">จับคู่เครื่อง Kiosk</h1>
              <p className="text-sm text-black/70">
                ใส่ Pairing Code หรือ Kiosk Token เพื่อผูกอุปกรณ์นี้กับหน้า /self-check
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <PairClient />
            </div>
          </div>
        </main>

        <div className="h-16 bg-[#6ABE75]" />
      </div>
    </div>
  );
}
