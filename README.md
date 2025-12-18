# Lab Booking System

ระบบจองห้องปฏิบัติการ + ยืมคืนกุญแจ (Next.js App Router)

## Tech Stack
- Next.js (App Router)
- NextAuth v4 (Credentials)
- Prisma + PostgreSQL
- shadcn/ui + Tailwind
- Upstash Redis (Rate limit)
- QR Token (User signed token)

## Roles
- STUDENT: จองห้อง, ดูรายการของฉัน, จัดการผู้ร่วม (เฉพาะ AD_HOC), ดู QR Token ของฉัน
- TEACHER: อนุมัติ/ปฏิเสธคำขอ
- ADMIN: Loan Desk (ยืม/คืนกุญแจ)

## Core Flow
1) Student จองห้อง -> PENDING
2) Teacher อนุมัติ -> APPROVED
3) Loan Desk “รับกุญแจ” (สแกน/วาง QR Token ของผู้ยืม) -> CHECKED_IN + Key BORROWED + Loan created
4) Loan Desk “คืนกุญแจ” (สแกน/วาง QR Token ของผู้คืน) -> COMPLETED + Key AVAILABLE + Loan closed

## Borrow/Return Permission
- IN_CLASS: คนที่อยู่ใน Enrollment ของ Section สามารถยืม/คืนได้
- AD_HOC: ผู้จอง + ผู้ร่วม (ReservationParticipant) รวมไม่เกิน 5 คน

## Run locally
```bash
npm install
npm run dev


# Prisma

npx prisma migrate dev
npx prisma studio
