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
      <div className="w-full max-w-[480px] rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground mt-2">
          เลือกประเภทผู้ใช้ แล้วกรอกรหัสผ่านเพื่อเข้าสู่ระบบ
        </p>

        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
