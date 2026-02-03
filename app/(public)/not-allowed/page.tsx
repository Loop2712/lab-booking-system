import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { Kanit } from "next/font/google";
import { authOptions } from "@/lib/auth/options";
import { Button } from "@/components/ui/button";
import { dashboardHref } from "../dashboardHref";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "600", "700"],
});

export default async function NotAllowedPage() {
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
              <Button asChild className="bg-[#6ABE75] text-white hover:bg-[#5AAE67]">
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-semibold text-[#6ABE75]">ใช้ได้เฉพาะเครื่องเคาน์เตอร์</h1>
            <p className="text-sm text-black/70">
              หน้านี้เปิดใช้งานได้เฉพาะอุปกรณ์ที่ถูกจับคู่ไว้แล้ว หากต้องการใช้งาน โปรดติดต่อผู้ดูแลระบบ
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/">กลับหน้าแรก</Link>
              </Button>
              <Button asChild className="bg-[#6ABE75] text-white hover:bg-[#5AAE67]">
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            </div>
          </div>
        </main>

        <div className="h-16 bg-[#6ABE75]" />
      </div>
    </div>
  );
}
