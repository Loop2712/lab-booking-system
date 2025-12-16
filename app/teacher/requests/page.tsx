import TeacherRequestsTable from "./table";

export default function TeacherRequestsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">คำขอจองที่รออนุมัติ</h1>
      <p className="text-sm text-muted-foreground">
        อนุมัติหรือปฏิเสธคำขอจอง (เฉพาะสถานะ PENDING)
      </p>

      <TeacherRequestsTable />
    </div>
  );
}
