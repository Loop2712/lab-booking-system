import ห้องTodayClient from "./rooms-today-client";

export const runtime = "nodejs";

export default async function RoomsTodayPage() {
  // ✅ เอา requireRole ออก เพื่อให้ public เข้าได้
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">เช็คห้องว่างวันนี้ (Real-time)</h1>
        <p className="text-sm text-muted-foreground">
        </p>
      </div>

      <ห้องTodayClient />
    </div>
  );
}
