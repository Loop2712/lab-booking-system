QR_TOKEN_SECRET ใช้ค่า default — ค่า "change-this-to-a-long-random-string" เป็น placeholder ไม่ได้เปลี่ยน ทำให้ QR Token ถูกปลอมแปลงได้ง่าย

ใช้ as any กว่า 50+ จุด — ทั่วทั้ง codebase ใช้ 
(session as any)?.role, (session as any)?.uid ซ้ำๆ ในทุก API route ทำให้:
ไม่มี type-checking ที่ session เกิดข้อผิดพลาดได้ง่ายถ้า session shape เปลี่ยน
แก้ไขได้โดยสร้าง typed session helper เช่น:
type AppSession = { uid: string; role: Role; studentId?: string | null; ... }
function getAppSession(session: any): AppSession | null { ... }

Role type ถูก define ซ้ำหลายที่
lib/auth/guard.ts
lib/auth/api-guard.ts
proxy.ts
app/generated/prisma/enums.ts

Auth guard ไม่ consistent — มี 3 pattern ที่ใช้ตรวจสอบ
requireRole()ใน layout (server component)
requireAdmin() ใน API route
manual getServerSession() + (session as any)?.role ใน API route
ควรเลือก pattern เดียวให้ consistent

InClass generate ใช้ UTC ตรงๆ —  lib/inclass/generate.ts ใช้ combineUTC()
 เก็บเวลาเป็น UTC ในขณะที่ reservation route ใช้ +07:00 (Bangkok timezone) → อาจเกิดปัญหา timezone mismatch ระหว่าง IN_CLASS กับ AD_HOC reservations


 ไม่มี error boundary — ไม่พบ error.tsx / not-found.tsx ใน route groups → user จะเห็น generic error page