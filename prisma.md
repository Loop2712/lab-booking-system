# Prisma Schema (อัปเดตให้ตรงกับโปรเจคจริง)

เอกสารนี้สรุป Prisma schema ของโปรเจค **Lab Key Booking System** ให้ “ตรงกับไฟล์จริง” ที่อยู่ใน `prisma/schema.prisma`

> หมายเหตุ: โปรเจคนี้ใช้ `generator client` แบบ custom output ไปที่ `app/generated/prisma` (ตาม `schema.prisma`)

---

## Enumerations

- `Role`: ADMIN, TEACHER, STUDENT
- `Gender`: MALE, FEMALE, OTHER
- `StudentType`: REGULAR, SPECIAL
- `DayOfWeek`: MON..SUN
- `KeyStatus`: AVAILABLE, BORROWED, LOST, DAMAGED
- `ReservationType`: IN_CLASS, AD_HOC
- `ReservationStatus`: PENDING, APPROVED, REJECTED, CANCELLED, NO_SHOW, CHECKED_IN, COMPLETED

---

## จุดสำคัญที่ต่างจากเอกสารเดิม (prisma.md เวอร์ชันก่อน)

1) `Room` มีฟิลด์เพิ่ม: `code`, `name`, `isActive` (และใช้ `code` เป็น unique)
2) `Reservation` มีฟิลด์เพิ่มเพื่อรองรับ “การจองแบบ slot”:
   - `date` (เก็บเป็นวัน 00:00)
   - `slot` (เช่น `"08:00-12:00"`)
   - มี `@@unique([roomId, date, slot])` เพื่อกันชน slot ในห้องเดียวกัน
3) เพิ่มตาราง `ReservationParticipant` สำหรับ “ผู้ร่วมจอง” (AD_HOC) และมี unique `(reservationId, userId)`
4) `Loan` มีฟิลด์เพิ่มบางส่วน (เช่นผู้รับคืน/ผู้ทำรายการ) ตามโค้ดจริงใน `schema.prisma`

---

## Prisma Schema (ย่อแบบอ่านง่าย)

> รายละเอียดเต็มดูที่ `prisma/schema.prisma`

### User
- เก็บข้อมูลผู้ใช้ทุก role (ADMIN/TEACHER/STUDENT)
- STUDENT ใช้ `studentId` (11 หลัก, unique)
- TEACHER/ADMIN ใช้ `email` (unique)

Relations หลัก:
- taughtSections, enrollments
- requestedResv (Requester), approvedResv (Approver)
- handledLoans (HandledBy)
- reservationParticipants

### Room
- `code` (unique), `name`, `roomNumber`, `floor`, `computerCount`, `isActive`
- relation กับ `Key`, `Section`, `Reservation`

### Key
- `keyCode` (unique), `status`
- relation กับ `Room`, `Loan`

### Course / Section / Enrollment
- โครงสร้างรายวิชา/กลุ่มเรียน/ลงทะเบียน
- `Section` มี dayOfWeek + startTime/endTime + term/year + isActive

### Reservation
- type: IN_CLASS | AD_HOC
- status: PENDING/APPROVED/.../COMPLETED
- requester/approver, room, section (optional)
- `date` (00:00), `slot` (เช่น 08:00-12:00)
- `startAt/endAt` ใช้สำหรับ logic เวลา (late/no-show/ชนเวลา)
- participants: ReservationParticipant[]
- loan: Loan?

Index/Constraint:
- `@@unique([roomId, date, slot])`
- `@@index([roomId, startAt, endAt])`
- `@@index([requesterId, startAt])`

### ReservationParticipant
- สำหรับผู้ร่วมใช้งานใน Ad-hoc
- `@@unique([reservationId, userId])`

### Loan
- เชื่อมกับ Reservation (1:1)
- เก็บ keyId, checkedInAt/checkedOutAt และผู้ทำรายการ (handledBy ฯลฯ)

---

## แนะนำเวลาแก้/เพิ่ม schema

- แก้ `prisma/schema.prisma` เป็นหลัก แล้วรัน migration
- อย่าลืม regenerate prisma client ตามคำสั่งในโปรเจค (เช่น `npx prisma generate`)
