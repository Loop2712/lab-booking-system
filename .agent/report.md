สร้างหน้า Admin Reports สำหรับระบบยืมคืนกุญแจห้องแลปคอมพิวเตอร์ ด้วย Next.js App Router + TypeScript + Prisma + NextAuth (Credentials) + Tailwind + shadcn/ui + date-fns

ข้อกำหนดหลัก
- สร้าง route: /admin/reports
- เฉพาะผู้ใช้ role=ADMIN เข้าได้ และเพิ่มเมนูใน แดชบอร์ด admin 
- หน้านี้มี 3 ส่วน: (1) Filter/Search (2) Summary cards (3) Results table + Export PDF button
- ใช้ Route Handlers แบบ REST ที่ /api/admin/reports/summary และ /api/admin/reports/reservations
- Validation ด้วย zod
- Date handling ด้วย date-fns
- UI ใช้ shadcn/ui components

โครงข้อมูลอ้างอิง Prisma (มีอยู่แล้ว):
- Reservation: type, status, requester, approver, room, section, startAt, endAt, note, loan
- Loan: key, checkedInAt, checkedOutAt, handledBy
- Key: keyCode, status, room
- Room: roomNumber, floor

1) สร้างหน้า UI: app/admin/reports/page.tsx
ต้องมีฟอร์ม filter:
- dateFrom (required) และ dateTo (required)
- reservationType (optional): IN_CLASS | AD_HOC | ALL
- reservationStatus (optional): PENDING|APPROVED|REJECTED|CANCELLED|NO_SHOW|CHECKED_IN|COMPLETED|ALL
- roomId (optional) หรือ room search (roomNumber/floor)
- keyId (optional) หรือ key search (keyCode)
- requester query (optional): studentId หรือ email หรือชื่อ-นามสกุล
ปุ่ม:
- Search
- Reset
- Export PDF (export เฉพาะผลลัพธ์ตาม filter เดียวกัน)

2) Summary Cards
หลัง Search ให้เรียก GET /api/admin/reports/summary?dateFrom=...&dateTo=...&type=...&status=...
แสดง cards:
- totalReservations
- totalCompleted
- totalCancelled
- totalNoShow
- totalCheckedIn
- breakdownByType: IN_CLASS/AD_HOC counts

3) Results Table
หลัง Search ให้เรียก GET /api/admin/reports/reservations?... (รับ filter เดียวกัน)
ตารางต้องมี column:
- StartAt-EndAt (แสดง format)
- Room (roomNumber + floor)
- Key (keyCode ถ้ามี loan)
- Requester (ชื่อ-นามสกุล + role + studentId/email)
- Type
- Status
- Check-in time
- Check-out time
- HandledBy (admin ผู้รับ-คืน ถ้ามี)
- Duration (ชั่วโมงจริงจาก checkedInAt -> checkedOutAt ถ้าครบ)
ให้ทำ pagination แบบง่าย: page, pageSize (default 20) และ totalCount

4) Route Handlers
สร้าง:
- app/api/admin/reports/summary/route.ts
- app/api/admin/reports/reservations/route.ts
ทั้งสองต้อง:
- ตรวจ session จาก NextAuth และ role ต้องเป็น ADMIN (สร้าง helper requireAdmin)
- parse query ด้วย zod (dateFrom/dateTo เป็น ISO string)
- ใช้ Prisma query + aggregation:
  summary:
   - count reservations ทั้งหมดในช่วง startAt/endAt (ใช้ startAt >= dateFrom AND startAt <= dateTo หรือ overlap ด้วยช่วงเวลา: startAt < dateTo AND endAt > dateFrom)
   - count ตาม status
   - count ตาม type
  reservations list:
   - findMany reservations ตามช่วงเวลา + filter อื่น ๆ
   - include requester, approver, room, section, loan(include key, handledBy)
   - orderBy startAt desc
   - return {items, page, pageSize, totalCount}

5) Export PDF
ทำ endpoint: app/api/admin/reports/export/pdf/route.ts
- method POST รับ JSON body filter + items (หรือ filter อย่างเดียวแล้ว server query เอง)
- สร้าง PDF จาก HTML template (recommend: puppeteer) หรือใช้ @react-pdf/renderer
- ใน PDF ต้องมี:
  - report title + date range
  - summary section
  - table รายการ 1-200 รายการแรก (กันหนัก)
- response เป็น application/pdf

6) Shared utilities
สร้างโฟลเดอร์:
- lib/auth/requireAdmin.ts (getServerSession + check role)
- lib/reports/filters.ts (zod schema + helper buildWhereClause)
- lib/reports/format.ts (formatters)

7) UI details
- ใช้ shadcn Form + Input + Select + Date picker (ถ้าไม่มี date picker ให้ทำเป็น input type="date")
- Loading state + error toast
- ใช้ React Server Component เป็น wrapper ได้ แต่ส่วน form/table ทำเป็น client component: components/admin/reports/ReportClient.tsx

8) Deliverables
- สร้างไฟล์ทั้งหมดตามที่ระบุ
- เขียนโค้ดให้ run ได้จริง และไม่ใส่ pseudo code
- ใส่ TODO เฉพาะส่วนที่ต้องปรับ config puppeteer ถ้าจำเป็น (เช่น deploy on serverless)

เริ่มทำเลย: สร้างไฟล์ + โค้ดครบทุกส่วนตามรายการข้างบน
