import RoomTodayClient from "./rooms-today-client";

export default async function RoomsTodayPage() {
  // ✅ เอา requireRole ออก เพื่อให้ public เข้าได้
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Room (Real-time)</h1>
        <p className="text-sm text-muted-foreground">
        </p>
      </div>

      <RoomTodayClient />
    </div>
  );
}
