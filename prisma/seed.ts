import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ====== ตั้งค่าข้อมูลตัวอย่าง (แก้ได้ตามใจ) ======
  const adminEmail = "admin@lab.local";
  const teacherEmail = "teacher@lab.local";
  const studentStudentId = "65000000001"; // 11 หลัก

  const birthAdmin = new Date("19900101");
  const birthTeacher = new Date("19850615");
  const birthStudent = new Date("20040220");

  const adminPass = "19900101";
  const teacherPass = "19850615";
  const studentPass = "20040220";

  const passwordHash = await bcrypt.hash("changeme123", 10);

  const adminHash = await bcrypt.hash(adminPass, 10);
  // ====== USERS ======
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      role: "ADMIN",
      email: adminEmail,
      firstName: "Admin",
      lastName: "System",
      birthDate: birthAdmin,
      passwordHash: adminHash
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: {},
    create: {
      role: "TEACHER",
      email: teacherEmail,
      firstName: "Teacher",
      lastName: "One",
      birthDate: birthTeacher,
      passwordHash,
    },
  });

  const student = await prisma.user.upsert({
    where: { studentId: studentStudentId },
    update: {},
    create: {
      role: "STUDENT",
      studentId: studentStudentId,
      firstName: "Student",
      lastName: "One",
      birthDate: birthStudent,
      major: "CS",
      studentType: "REGULAR",
      passwordHash,
    },
  });

  // ====== ROOM + KEY ======
  const room = await prisma.room.upsert({
    where: { roomNumber_floor: { roomNumber: "LAB-401", floor: 4 } },
    update: { computerCount: 40 },
    create: {
      roomNumber: "LAB-401",
      floor: 4,
      computerCount: 40,
    },
  });

  const key = await prisma.key.upsert({
    where: { keyCode: "KEY-LAB-401" },
    update: {},
    create: {
      keyCode: "KEY-LAB-401",
      roomId: room.id,
      status: "AVAILABLE",
    },
  });

  // ====== COURSE + SECTION ======
  const course = await prisma.course.upsert({
    where: { code: "SCS409" },
    update: { name: "Computer Lab Practice" },
    create: {
      code: "SCS409",
      name: "Computer Lab Practice",
    },
  });

  const section = await prisma.section.create({
    data: {
      courseId: course.id,
      teacherId: teacher.id,
      roomId: room.id,
      dayOfWeek: "MON",
      startTime: "08:00",
      endTime: "12:00",
      term: "1",
      year: 2025,
      isActive: true,
    },
  });

  // ====== ENROLLMENT ======
  await prisma.enrollment.upsert({
    where: { studentId_sectionId: { studentId: student.id, sectionId: section.id } },
    update: {},
    create: {
      studentId: student.id,
      sectionId: section.id,
    },
  });

  // (Optional) ตัวอย่าง reservation แบบ AD_HOC 4 ชม. (Pending) ไว้เทส approve
  const start = new Date();
  start.setHours(start.getHours() + 2, 0, 0, 0); // อีก 2 ชม.
  const end = new Date(start);
  end.setHours(end.getHours() + 4);

  await prisma.reservation.create({
    data: {
      type: "AD_HOC",
      status: "PENDING",
      requesterId: student.id,
      roomId: room.id,
      startAt: start,
      endAt: end,
      note: "Seed: student request",
    },
  });

  console.log("✅ Seed completed");
  console.log("Admin:", adminEmail, "birthDate:", birthAdmin.toISOString().slice(0, 10));
  console.log("Teacher:", teacherEmail, "birthDate:", birthTeacher.toISOString().slice(0, 10));
  console.log("Student:", studentStudentId, "birthDate:", birthStudent.toISOString().slice(0, 10));
  console.log("Room:", room.roomNumber, "Key:", key.keyCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
