export default function ForbiddenPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <p className="text-sm text-muted-foreground mt-2">
        กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ หรือกลับไปหน้าที่อนุญาต
      </p>
    </div>
  );
}