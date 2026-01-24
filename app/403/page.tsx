import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { roleToDashboard } from "./roleToDashboard";


export default async function ForbiddenPage() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.role as string | undefined;

  const dash = roleToDashboard(role);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">403 - Forbidden</h1>
        <p className="text-sm text-muted-foreground mt-2">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้
        </p>

        <div className="mt-6 flex gap-2">
          <Link
            href={dash}
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm text-white"
          >
            กลับไปหน้าแดชบอร์ด
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
