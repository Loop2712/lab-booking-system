import MyReservationsTable from "@/components/reservations/MyReservationsTable";

export default function AdminReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">รายการจองของฉัน</h1>
      <p className="text-sm text-muted-foreground">
        ดูสถานะคำขอจอง และยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 60 นาที
      </p>

      <MyReservationsTable />
    </div>
  );
}
