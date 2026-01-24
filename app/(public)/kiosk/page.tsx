import KioskClient from "./kiosk-client";

export default function KioskPage() {
  // ✅ public page แต่ใช้งานจริงต้องมี Scanner Key (ฝั่ง client ส่ง header ไป API)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kiosk • ยืม-คืนกุญแจ (สำหรับเจ้าหน้าที่)</h1>
        <p className="text-sm text-muted-foreground">
          กรอก Scanner Key เพื่อเปิดใช้งานตู้ยืม-คืน แล้วสแกน QR/Token เพื่อทำรายการ
        </p>
      </div>

      <KioskClient />
    </div>
  );
}
