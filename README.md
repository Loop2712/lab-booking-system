<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# Lab Booking System

ระบบจองห้องปฏิบัติการ + ยืมคืนกุญแจ (Next.js App Router)

## Tech Stack
- Next.js (App Router)
- NextAuth v4 (Credentials)
- Prisma + PostgreSQL
- shadcn/ui + Tailwind
- Upstash Redis (Rate limit)

## Roles
- STUDENT: จองห้อง, ดูรายการของฉัน, จัดการผู้ร่วม (เฉพาะ AD_HOC), ดู QR Token ของฉัน
- TEACHER: อนุมัติ/ปฏิเสธคำขอ
- ADMIN: Loan Desk (ยืม/คืนกุญแจ)

## Core Flow
1) Student จองห้อง -> PENDING  
2) Teacher อนุมัติ -> APPROVED  
3) Loan Desk “รับกุญแจ” (ต้องสแกน/วาง QR Token ของผู้ยืม) -> CHECKED_IN + Key BORROWED + Loan created  
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
