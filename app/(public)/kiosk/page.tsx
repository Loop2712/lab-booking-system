import KioskClient from "./kiosk-client";

export const runtime = "nodejs";

export default function KioskPage() {
  // ✅ public page แต่ใช้งานจริงต้องมี Scanner Key (ฝั่ง client ส่ง header ไป API)
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Kiosk • ยืม/คืนกุญแจ (ไม่ต้อง Login)</h1>
        <p className="text-sm text-muted-foreground">
          หน้านี้ใช้สำหรับ “เครื่องที่เจ้าหน้าที่ตั้งค่าไว้” เท่านั้น (ต้องมี Scanner Key)
        </p>
      </div>

      <KioskClient />
    </div>
  );
}
