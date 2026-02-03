ช่วยเขียนโค้ดระบบ “Kiosk Device”  โดยมีเงื่อนไขดังนี้:

STACK:
- ใช้ Route Handlers (app/api/.../route.ts)
- ใช้ cookie แบบ httpOnly

REQUIREMENTS:

1. ROUTES
- /self-check
  - เป็นหน้า kiosk สำหรับนักศึกษา
  - ต้องตรวจว่าเป็น “เครื่องที่ถูกผูกไว้” เท่านั้นถึงเข้าได้
- /kiosk/pair
  - หน้าให้ admin ใช้ “pair เครื่อง”
  - ใส่ pairing code หรือ kiosk token
  - ใช้ได้ครั้งเดียวต่อเครื่อง

2. DATABASE
แก้ไข  Prisma model ชื่อ KioskToken มีฟิลด์:
- id
- token (string, unique)
- isActive (boolean)
- pairedAt (DateTime)
- createdAt (DateTime, optional) @default(now())
- revokedAt (DateTime, optional)

3. PAIR FLOW
- เมื่อ admin pair เครื่อง:
  - server สร้าง deviceId แบบ random ยาว ๆ
  - บันทึกลง KioskToken (isActive=true)
  - ตั้ง cookie ชื่อ `Kiosk_Token` (httpOnly, secure, sameSite=strict, path=/self-check)
  - redirect ไป /self-check

4. DEVICE GUARD
- เขียน helper function requireKioskDevice()
- อ่าน cookie `kiosk_device`
- ตรวจใน DB ว่า deviceId นี้มีจริงและ isActive=true
- ถ้าไม่ผ่าน:
  - page → redirect /not-allowed
  - API → return 401/403

5. SECURITY
- ห้ามใช้ localStorage
- token ใช้แค่ตอน pair ครั้งแรก
- ทุก API ใต้ /api/self-check/* ต้องเรียก requireKioskDevice()

6. ADMIN REVOKE
- ตัวอย่าง API สำหรับ admin revoke device
- ตั้ง isActive=false หรือ revokedAt

OUTPUT ที่ต้องการ:
- Prisma model
- route.ts สำหรับ pair
- helper requireKioskDevice()
- การใช้ guard ใน page /self-check
- การใช้ guard ใน API (check-in / check-out)

และถ้าส่วนไหนที่มีในทั้งหน้าที่คาดว่าไม่ได้ใช้เแล้วสามารถลบได้