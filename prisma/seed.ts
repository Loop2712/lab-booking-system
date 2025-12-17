import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? "";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding database...");

  /* ================= USERS ================= */
  const adminHash = await bcrypt.hash("19900101", 10);
  const teacherHash = await bcrypt.hash("19850515", 10);
  const studentHash = await bcrypt.hash("20040220", 10);

  await prisma.user.upsert({
    where: { email: "admin@lab.local" },
    update: {},
    create: {
      role: "ADMIN",
      email: "admin@lab.local",
      firstName: "Admin",
      lastName: "System",
      birthDate: new Date("1990-01-01"), // ✅ ถูกต้อง
      passwordHash: adminHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "teacher@lab.local" },
    update: {},
    create: {
      role: "TEACHER",
      email: "teacher@lab.local",
      firstName: "Teacher",
      lastName: "One",
      birthDate: new Date("1985-05-15"),
      passwordHash: teacherHash,
    },
  });

  await prisma.user.upsert({
    where: { studentId: "65000000001" },
    update: {},
    create: {
      role: "STUDENT",
      studentId: "65000000001",
      firstName: "Student",
      lastName: "One",
      birthDate: new Date("2004-02-20"),
      passwordHash: studentHash,
    },
  });

  console.log("✅ Users seeded");

  /* ================= ROOMS ================= */
  await prisma.room.createMany({
    data: [
      {
        code: "LAB-A",
        name: "Lab A (Computer)",
        roomNumber: "A101",
        floor: 1,
        computerCount: 40,
        isActive: true,
      },
      {
        code: "LAB-B",
        name: "Lab B (Network)",
        roomNumber: "B201",
        floor: 2,
        computerCount: 30,
        isActive: true,
      },
      {
        code: "LAB-C",
        name: "Lab C (AI)",
        roomNumber: "C301",
        floor: 3,
        computerCount: 25,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  const allRooms = await prisma.room.findMany({ select: { id: true, code: true } });

for (const r of allRooms) {
  await prisma.key.upsert({
    where: { keyCode: `${r.code}-KEY-1` },
    update: {},
    create: {
      keyCode: `${r.code}-KEY-1`,
      status: "AVAILABLE",
      roomId: r.id,
    },
  });
}


  console.log("✅ Rooms seeded");
  console.log("🌱 Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
