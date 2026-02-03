import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { Kanit } from "next/font/google";
import { authOptions } from "@/lib/auth/options";
import { Button } from "@/components/ui/button";
import RoomsTodayClient from "./rooms-today/rooms-today-client";
import { dashboardHref } from "./dashboardHref";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "600", "700"],
});


export default async function PublicHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  const isLoggedIn = !!session;

  const buttonHref = isLoggedIn ? dashboardHref(role) : "/login";
  const buttonText = isLoggedIn ? "ไปที่แดชบอร์ด" : "LOGIN";

  return (
    <div className={kanit.className}>
      <div className="min-h-screen bg-gradient-to-b from-stone-50 via-stone-50 to-emerald-50 text-black">
        <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Lab Booking Logo" width={140} height={40} priority />
            </div>

            <nav className="hidden items-center gap-6 text-sm font-medium text-black sm:flex">
              <Link href="/rooms-today" className="hover:text-[#6ABE75] transition">
                MENU 1
              </Link>
            </nav>

            <Button
              asChild
              className="bg-[#6ABE75] text-white hover:bg-[#5AAE67]"
            >
              <Link href={buttonHref}>{buttonText}</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-[#6ABE75]">สถานะห้องวันนี้</h1>
            <div className="h-1 w-72 rounded-full bg-[#6ABE75]/60" />
            <p className="text-sm text-black/70">
              แสดงตารางห้องเรียนและการจองทั้งแบบตารางเรียนและจองนอกตารางเรียน พร้อมสถานะการใช้งาน
            </p>
          </div>

          <div className="mt-6">
            <RoomsTodayClient />
          </div>
        </main>

        <div className="h-16 bg-[#6ABE75]" />
      </div>
    </div>
  );
}
