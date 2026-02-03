import RoomTodayClient from "./rooms-today-client";

export default async function RoomsTodayPage() {
  // ✅ เอา requireRole ออก เพื่อให้ public เข้าได้
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Room (Real-time)</h1>
        <p className="text-sm text-muted-foreground">
          ตารางสถานะห้องเรียนแบบเรียลไทม์ พร้อมการจองตามตารางเรียนและจองนอกตาราง
        </p>
      </div>

      <RoomTodayClient />
    </div>
  );
}
