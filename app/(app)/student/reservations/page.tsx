import MyReservationsTable from "./table";

export default function StudentReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">รายการจองของฉัน</h1>
      <p className="text-sm text-muted-foreground">
        ดูสถานะคำขอจอง และยกเลิกได้เฉพาะรายการที่ยังเป็น PENDING
      </p>

      <MyReservationsTable />
    </div>
  );
}
