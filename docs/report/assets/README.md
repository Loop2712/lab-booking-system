# โฟลเดอร์รูปภาพประกอบรูปเล่ม

## ไฟล์ปัจจุบัน

| ไฟล์ | คำอธิบาย |
|---|---|
| `figure-3.1-context-diagram.jpg` | Context Diagram (ต้นฉบับที่ผู้จัดทำส่งมา) |
| `figure-3.1-context-diagram-mermaid.png` | Context Diagram (สร้างใหม่ด้วย Mermaid - ทางเลือก) |
| `figure-3.2-dfd-level0.png` | DFD Level 0 — 6 กระบวนการ (Yourdon Style) |
| `figure-3.3-flowchart-booking.png` | Flowchart กระบวนการจองและอนุมัติ |
| `figure-3.4-flowchart-loan-return.png` | Flowchart กระบวนการยืม-คืนกุญแจ |
| `figure-3.5-er-diagram.png` | E-R Diagram (14 ตารางจาก prisma/schema.prisma) |
| `01-context.mmd` … `05-erd.mmd` | ไฟล์ต้นฉบับ Mermaid (เปิดแก้ได้ที่ https://mermaid.live) |

## วิธีสร้างรูปจาก Mermaid Diagram

ในไฟล์ `chapter3.md` มีบล็อกโค้ด Mermaid สำหรับสร้างแผนภาพต่าง ๆ ได้แก่

| รูป | คำอธิบาย | ตำแหน่งในรูปเล่ม |
|---|---|---|
| รูปที่ 3.2 | Data Flow Diagram Level 0 | บทที่ 3 หัวข้อ 3.2 |
| รูปที่ 3.3 | DFD Level 1 ของกระบวนการยืม-คืน | บทที่ 3 หัวข้อ 3.3 |
| รูปที่ 3.4 | แผนภาพ E-R ของฐานข้อมูล | บทที่ 3 หัวข้อ 3.4 |
| รูปที่ 3.5 | แผนภาพ Use Case | บทที่ 3 หัวข้อ 3.5 |
| รูปที่ 3.6 | แผนภาพลำดับการจองและอนุมัติ | บทที่ 3 หัวข้อ 3.6.1 |
| รูปที่ 3.7 | แผนภาพลำดับการ Check-in | บทที่ 3 หัวข้อ 3.6.2 |
| รูปที่ 3.8 | แผนภาพลำดับการคืนกุญแจ | บทที่ 3 หัวข้อ 3.6.3 |
| รูปที่ 3.9 | แผนภาพสถานะของการจอง | บทที่ 3 หัวข้อ 3.7 |

### วิธีที่ 1: ใช้ Mermaid Live Editor (แนะนำ)

1. เปิดเว็บไซต์ https://mermaid.live
2. ก๊อปข้อความใต้บรรทัด <code>```mermaid</code> ไปจนถึง <code>```</code> จาก `chapter3.md` ไปวางในช่องด้านซ้าย
3. กดปุ่ม "Actions" → "PNG" หรือ "SVG" เพื่อดาวน์โหลด
4. บันทึกไฟล์ลงในโฟลเดอร์นี้ (`assets/`) ด้วยชื่อ เช่น `figure-3.2-dfd-level0.png`

### วิธีที่ 2: ใช้ VS Code + Markdown Preview Mermaid Support Extension

1. ติดตั้งส่วนเสริม `Markdown Preview Mermaid Support` ใน VS Code
2. เปิดไฟล์ `chapter3.md` แล้วกด `Ctrl + Shift + V` เพื่อดูตัวอย่าง
3. คลิกขวาที่ภาพ Mermaid → Save Image As

### วิธีที่ 3: ใช้ Mermaid CLI

```bash
npm install -g @mermaid-js/mermaid-cli
# ตัวอย่างคำสั่ง
mmdc -i diagram.mmd -o figure-3.2-dfd-level0.png -b transparent
```

## คำแนะนำเพิ่มเติม

- ใช้ภาพแบบ PNG ความละเอียดอย่างน้อย 1200 พิกเซลในแนวกว้าง เพื่อให้ภาพคมชัดเมื่อพิมพ์
- ตั้งค่า Background เป็น white หรือ transparent
- ในไฟล์ Word ของคณะ ให้ตั้งค่า "Wrap Text" เป็น `In line with text` หรือ `Top and bottom` ตามความเหมาะสม
- จัดให้รูปภาพอยู่กึ่งกลางหน้ากระดาษ พร้อมคำบรรยายภาพแบบ Bold ตรงกลาง ตามรูปแบบของคณะ

## ภาพหน้าจอ (Screenshots)

ในบทที่ 4 มีตำแหน่ง `[รูปที่ 4.x]` หลายจุดที่ต้องการภาพหน้าจอจริงของระบบ แนะนำให้บันทึกในโฟลเดอร์นี้ตามชื่อ เช่น

- `figure-4.4-login.png`
- `figure-4.6-student-dashboard.png`
- `figure-4.7-student-reserve.png`
- `figure-4.10-student-qr.png`
- `figure-4.21-admin-reports.png`
- `figure-4.22-admin-reports-pdf.png`
- `figure-4.24-kiosk-checkin.png`

ใช้การจับหน้าจอที่ความละเอียดมาตรฐาน 1920×1080 หรือ 1440×900 และครอบเฉพาะพื้นที่หน้าจอเว็บ (ไม่ต้องมีแถบเบราว์เซอร์) เพื่อความสวยงาม
