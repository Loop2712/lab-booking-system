Global Layout & Spacing (แก้ความ “โล่ง” ทั้งระบบ)

เพิ่ม max-width ให้หน้า content หลัก

ตั้ง container หลักของทุกหน้าที่เป็น page content เป็น:

max-width: 1280px (หรือ 1440px สำหรับ admin)

width: 100%

margin: 0 auto

ลด white space ด้านข้าง: padding-inline: 24px (desktop), 16px (mobile)

สร้าง layout grid มาตรฐาน

Dashboard/Admin: ใช้ grid และ gap: 16-24px

กำหนด section spacing:

ระหว่าง header กับ content: 24px

ระหว่าง section: 24-32px

ปรับ typography hierarchy

H1: 24–28px / semi-bold

H2: 18–20px / semi-bold

Body: 14–16px

ลดข้อความรองให้เบากว่า (สีเทา): text-gray-500/600

กำหนด design tokens (สี/มุม/เงา)

Primary: เขียวเดิม (ใช้เป็น main action)

Background soft: เขียวอ่อนมาก ๆ สำหรับพื้นหลัง/สถานะ

Border: #E5E7EB (gray-200)

Radius: 12px (card), 10px (input/button)

Shadow: เบา ๆ สำหรับ card (ยกระดับให้ดูโปร)

B) Dashboard Admin (การ์ดสรุป + ตาราง)

ทำ “ลำดับความสำคัญ” ของ Summary Cards

เปลี่ยนจากการ์ดเท่ากันทุกใบ → ให้มี 1–2 ใบ “เด่น”

กำหนด:

การ์ดสำคัญ (เช่น “ห้องว่างวันนี้”, “รออนุมัติ”): span กว้างขึ้น (2 columns)

การ์ดทั่วไป: 1 column

เพิ่ม “ตัวเลข” ให้ใหญ่ขึ้น:

ตัวเลข: 28–32px bold

label: 12–14px

เพิ่ม state colors ให้การ์ดบางประเภท

Pending/รออนุมัติ: โทนส้ม/เหลือง (badge)

Overdue/ค้างคืน: โทนแดง (badge)

Available/ว่าง: โทนเขียว (badge)

ปรับตารางสถานะห้องให้ไม่เหมือน Excel

ลดเส้นแบ่ง: ใช้ divider บาง ๆ เฉพาะ row

เพิ่ม row hover และ cursor:pointer ถ้ากดดูรายละเอียดได้

เพิ่ม zebra (สลับสีอ่อนมาก) หรือ row highlight (optional)

ทำ “สถานะ” เป็น pill ใหญ่ขึ้น:

สูง 28–32px, padding ซ้ายขวา 12px

ย้าย search/filter ให้อยู่ใน toolbar เดียวเหนือ table

ด้านซ้าย: search

ด้านขวา: ปุ่ม “รีเฟรช” + filter เพิ่มเติม

ลดความสูงของ toolbar ไม่ให้กินพื้นที่เกิน

C) หน้า “สถานะห้องวันนี้” (ตารางเวลา)

เปลี่ยนการแสดงผลตารางเวลาให้ “มีบล็อกเวลา”

แทนที่ช่องว่างโล่ง → แสดงเป็น block/heatmap:

เวลา “มีเรียน” = block สี

เวลา “ว่าง” = พื้นขาว/เทาอ่อน

ทำ sticky header:

แถวเวลา (07:00, 08:00…) sticky top

คอลัมน์ชื่อห้อง sticky left

เพิ่ม legend ที่ชัดเจน

เพิ่ม legend แบบ pill: “มีเรียน”, “จอง”, “ว่าง”

วางไว้ใกล้หัวตาราง

ลดความสูงแถว (row height)

จากสูงมาก → เหลือประมาณ 44–56px

เพื่อให้เห็นหลายห้องขึ้น

D) หน้า “ยืม–คืนกุญแจ” (Kiosk / Student)

ทำ flow แบบ Step-based

Step 1: เลือกโหมด (ยืม/คืน) → ทำเป็น segmented control ชัด ๆ

Step 2: เลือกห้อง → grid ของปุ่มห้อง

Step 3: ยืนยัน → ปุ่ม CTA ใหญ่

จัดปุ่มห้องเป็น Grid

Desktop: 3–4 columns

Tablet: 2–3 columns

Mobile: 1–2 columns

ลดช่องว่างด้านข้างของ card ให้ content ดูเต็มขึ้น

แสดงสถานะห้องบนปุ่ม

ว่าง/พร้อมยืม: สีเขียวอ่อน + icon

ไม่พร้อม/ถูกยืม: disable + สีเทา + tooltip/label “กำลังใช้งาน”

ปุ่ม selected: border หนา + background เบา ๆ

เพิ่ม Summary bar ด้านบนของ card

แสดง: โหมดที่เลือก + ห้องที่เลือก + สถานะ

ลดการ “คิดเอง” ของผู้ใช้

E) Login Page

ทำ login ให้ดูเป็น entry point

เพิ่มหัวเรื่องใหญ่ + คำอธิบายสั้น

ขยาย card login ให้ใหญ่ขึ้นเล็กน้อย (ความกว้าง 420–480px)

เพิ่ม spacing ในฟอร์มให้แน่นขึ้น:

gap 12–16px

ปุ่ม “เข้าสู่ระบบ” ใช้ primary สีเดียวกับระบบ

ปรับปุ่มเลือกประเภทผู้ใช้

ทำเป็น segmented control เต็มความกว้าง

แสดง state ชัดเจน: active = primary, inactive = outline

F) Interaction / Polish (เพิ่มความโปรแบบไม่ต้อง redesign)

เพิ่ม empty state / loading state ทุกตาราง

ถ้าไม่มีข้อมูล: แสดงข้อความ + icon + ปุ่ม action (เช่น “รีเฟรช”)

loading: skeleton แทนการปล่อยโล่ง

เพิ่ม feedback หลัง action

toast/snackbar: “ยืมสำเร็จ”, “คืนสำเร็จ”, “บันทึกแล้ว”

error state: ข้อความสั้น + วิธีแก้

เพิ่ม icon ให้เมนู sidebar และทำ active state ให้ชัด

active: background เขียวอ่อน + indicator bar ซ้าย

hover: เพิ่มสีพื้นเบา ๆ