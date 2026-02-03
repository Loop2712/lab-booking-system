import RoomTodayClient from "@/app/(public)/rooms-today/rooms-today-client";

export default function StudentRoomsTodayPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">ห้องที่ใช้งานวันนี้</h1>
        <p className="text-sm text-muted-foreground">
          แสดงสถานะการใช้งานห้องแบบเรียลไทม์ ทั้งตารางเรียนและการจองนอกตาราง
        </p>
      </div>

      <RoomTodayClient />
    </div>
  );
}
