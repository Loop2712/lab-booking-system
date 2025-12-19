import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;

  const callbackUrl = sp?.callbackUrl ?? "/login";
  const initialError = sp?.error ?? null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          เลือกประเภทผู้ใช้ แล้วกรอกรหัสผ่าน (YYYYMMDD)
        </p>

        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
