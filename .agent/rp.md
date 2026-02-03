จุดที่เงื่อไข “ยังไม่กระชับ” หรือควรครอบคลุมมากขึ้น

1 การจองแบบ custom time ไม่มีเพดานระยะเวลา/ช่วงเวลาทำการ กำหนดเพดานเป็นการจองได้ตั้งแต่ 7 โมง ถึง 3 ทุ่ม

2 การเพิ่มผู้ร่วม (participants) ในการจอง ตรวจ isActive ถ้าไม่ isActive ให้ไม่สามารถเพิ่มได้

3 การลงทะเบียนเรียน (Enrollment) ตรวจว่า Section active หรือป่าว ถ้าไม่ active ให้ไม่สามารถเพิ่มได้
ควรตรวจ Section ที่ active และเงื่อนไขอื่นก่อนสร้าง enrollment.

4 ใน check-in/return มีเงื่อนไขว่า ถ้ามี enrollments จะต้องเป็นนักศึกษาที่ลงทะเบียน แต่ถ้า section ไม่มีใครลงทะเบียน จะผ่านได้ (allow) ให้แก้เป็นถ้าไม่มีใครลงทะเบียนก็ไม่สามารถยืม/คืนในเวลานั้นได้

5 Self-check ฝั่ง Admin ปฏิเสธ TEACHER ขณะที่ Kiosk check-in/return รองรับ TEACHER ด้วย ให้แก้ไขให้ Self-check รองรับ TEACHER ด้วย

6 Cron no-show เปิดได้ถ้าไม่ตั้ง CRON_SECRET บังคับให้ต้องมี CRON_SECRET เสมอ
หาก CRON_SECRET ไม่ถูกตั้งค่า → return unauthorized (หรือ error)
ถ้าตั้งค่าแล้ว → ตรวจ Authorization: Bearer <secret>
