import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const REQUIRED_HEADERS = [
  "course_code",
  "course_name",
  "teacher_email",
  "room_code",
  "day_of_week",
  "start_time",
  "end_time",
];

const DOW = new Set(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

function normalizeKey(k: string) {
  return String(k ?? "").trim().toLowerCase();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur.trim());
  return out;
}

async function loadRowsFromFile(
  fileObj: File
): Promise<{ rows: Record<string, any>[]; meta: { kind: "xlsx" | "csv" } }> {
  const name = (fileObj.name || "").toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = Buffer.from(await fileObj.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
    return { rows, meta: { kind: "xlsx" } };
  }

  const text = (await fileObj.text()).replace(/^\uFEFF/, "").trim();
  if (!text) return { rows: [], meta: { kind: "csv" } };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], meta: { kind: "csv" } };

  const headers = parseCsvLine(lines[0]).map((h) => String(h ?? "").trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const obj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cols[j] ?? "";
    }
    rows.push(obj);
  }

  return { rows, meta: { kind: "csv" } };
}

function normalizeTimeInput(value: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: false, value: "" };

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0 && num < 1) {
      const total = Math.round(num * 24 * 60);
      const h = Math.floor(total / 60) % 24;
      const m = total % 60;
      return {
        ok: true,
        value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      };
    }
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { ok: false, value: raw };
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return { ok: false, value: raw };

  return { ok: true, value: `${String(h).padStart(2, "0")}:${match[2]}` };
}

function toMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function parseIsActive(input: string) {
  const v = String(input ?? "").trim().toLowerCase();
  if (!v) return { ok: true, value: true };
  if (v === "1" || v === "true") return { ok: true, value: true };
  if (v === "0" || v === "false") return { ok: true, value: false };
  return { ok: false, value: true };
}

function makeRowKey(row: ParsedRow) {
  return [
    row.courseCode.toLowerCase(),
    row.teacherEmail.toLowerCase(),
    row.roomCode.toLowerCase(),
    row.dayOfWeek.toLowerCase(),
    row.startTime,
    row.endTime,
    row.term.toLowerCase(),
    String(row.year),
  ].join("|");
}

function makeSectionKey(input: {
  courseId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  termId: string | null;
}) {
  return [
    input.courseId,
    input.teacherId,
    input.roomId,
    input.dayOfWeek,
    input.startTime,
    input.endTime,
    input.termId ?? "",
  ].join("|");
}

type ParsedRow = {
  line: number;
  courseCode: string;
  courseName: string;
  teacherEmail: string;
  roomCode: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  term: string;
  year: number;
  isActive: boolean;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const guard = requireApiRole(session, ["ADMIN"]);
    if (!guard.ok) return guard.response;

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const form = await req.formData();
    const file = form.get("file");

    const defaultTerm = String(form.get("defaultTerm") ?? "").trim();
    const defaultYearRaw = String(form.get("defaultYear") ?? "").trim();

    if (defaultYearRaw && !/^\d{4}$/.test(defaultYearRaw)) {
      return NextResponse.json(
        { ok: false, message: "defaultYear ต้องเป็นปี ค.ศ. 4 หลัก (เช่น 2026)" },
        { status: 400 }
      );
    }

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, message: "กรุณาอัปโหลดไฟล์ในช่อง file (.xlsx หรือ .csv)" },
        { status: 400 }
      );
    }

    const fileObj = file as File;
    const { rows } = await loadRowsFromFile(fileObj);

    if (!rows.length) {
      return NextResponse.json({ ok: false, message: "ไฟล์ว่าง หรือไม่มีข้อมูลแถว" }, { status: 400 });
    }
    if (rows.length > 5000) {
      return NextResponse.json({ ok: false, message: "มากเกินไป (จำกัด 5000 แถว)" }, { status: 400 });
    }

    const firstRowKeys = Object.keys(rows[0] ?? {}).map(normalizeKey);
    const missing = REQUIRED_HEADERS.filter((k) => !firstRowKeys.includes(k));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, message: `ขาดคอลัมน์: ${missing.join(", ")} (ต้องมี ${REQUIRED_HEADERS.join(", ")})` },
        { status: 400 }
      );
    }

    const parsed: ParsedRow[] = [];
    const errors: Array<{ line: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r0 = rows[i] ?? {};

      const get = (k: string) => {
        const target = normalizeKey(k);
        for (const key of Object.keys(r0)) {
          if (normalizeKey(key) === target) return String(r0[key] ?? "").trim();
        }
        return "";
      };

      const courseCode = get("course_code");
      const courseName = get("course_name");
      const teacherEmail = get("teacher_email");
      const roomCode = get("room_code");
      const dayOfWeek = get("day_of_week").toUpperCase();
      const startTimeRaw = get("start_time");
      const endTimeRaw = get("end_time");
      const startParsed = normalizeTimeInput(startTimeRaw);
      const endParsed = normalizeTimeInput(endTimeRaw);
      const startTime = startParsed.ok ? startParsed.value : startTimeRaw;
      const endTime = endParsed.ok ? endParsed.value : endTimeRaw;
      const termValue = (get("term") || defaultTerm).trim();
      const yearValue = (get("year") || defaultYearRaw).trim();
      const isActiveRaw = get("is_active");

      if (!courseCode) {
        errors.push({ line: i + 2, message: "course_code ห้ามว่าง" });
        continue;
      }
      if (!courseName) {
        errors.push({ line: i + 2, message: "course_name ห้ามว่าง" });
        continue;
      }
      if (!teacherEmail) {
        errors.push({ line: i + 2, message: "teacher_email ห้ามว่าง" });
        continue;
      }
      if (!teacherEmail.includes("@")) {
        errors.push({ line: i + 2, message: "teacher_email ไม่ถูกต้อง" });
        continue;
      }
      if (!roomCode) {
        errors.push({ line: i + 2, message: "room_code ห้ามว่าง" });
        continue;
      }
      if (!DOW.has(dayOfWeek)) {
        errors.push({ line: i + 2, message: "day_of_week ต้องเป็น MON|TUE|WED|THU|FRI|SAT|SUN" });
        continue;
      }
      if (!startParsed.ok || !endParsed.ok) {
        errors.push({ line: i + 2, message: "รูปแบบเวลาไม่ถูกต้อง (H:MM หรือ HH:MM)" });
        continue;
      }
      if (toMinutes(endTime) <= toMinutes(startTime)) {
        errors.push({ line: i + 2, message: "end_time ต้องมากกว่า start_time" });
        continue;
      }
      if (!termValue) {
        errors.push({ line: i + 2, message: "term ห้ามว่าง (กรอกในแถวหรือใช้ค่าเริ่มต้น)" });
        continue;
      }
      if (!yearValue) {
        errors.push({ line: i + 2, message: "year ห้ามว่าง (กรอกในแถวหรือใช้ค่าเริ่มต้น)" });
        continue;
      }
      if (!/^\d{4}$/.test(yearValue)) {
        errors.push({ line: i + 2, message: "year ต้องเป็นปี ค.ศ. 4 หลัก" });
        continue;
      }

      const yearNum = Number(yearValue);
      if (!Number.isInteger(yearNum)) {
        errors.push({ line: i + 2, message: "year ไม่ถูกต้อง" });
        continue;
      }

      const activeParsed = parseIsActive(isActiveRaw);
      if (!activeParsed.ok) {
        errors.push({ line: i + 2, message: "is_active ต้องเป็น 1/0 หรือ true/false" });
        continue;
      }

      parsed.push({
        line: i + 2,
        courseCode,
        courseName,
        teacherEmail,
        roomCode,
        dayOfWeek,
        startTime,
        endTime,
        term: termValue,
        year: yearNum,
        isActive: activeParsed.value,
      });
    }

    const seen = new Map<string, number>();
    for (const row of parsed) {
      const key = makeRowKey(row);
      if (seen.has(key)) {
        const firstLine = seen.get(key) ?? row.line;
        errors.push({ line: row.line, message: `ข้อมูลซ้ำในไฟล์ (ซ้ำกับบรรทัด ${firstLine})` });
      } else {
        seen.set(key, row.line);
      }
    }

    if (errors.length) {
      return NextResponse.json(
        { ok: false, message: "พบข้อผิดพลาดในไฟล์", errors: errors.slice(0, 200) },
        { status: 400 }
      );
    }

    const courseCodes = Array.from(new Set(parsed.map((p) => p.courseCode)));
    const teacherEmails = Array.from(new Set(parsed.map((p) => p.teacherEmail)));
    const roomCodes = Array.from(new Set(parsed.map((p) => p.roomCode)));

    const [courses, teachers, rooms] = await Promise.all([
      prisma.course.findMany({
        where: { code: { in: courseCodes } },
        select: { id: true, code: true },
      }),
      prisma.user.findMany({
        where: { email: { in: teacherEmails }, role: "TEACHER" },
        select: { id: true, email: true },
      }),
      prisma.room.findMany({
        where: { code: { in: roomCodes } },
        select: { id: true, code: true },
      }),
    ]);

    const courseByCode = new Map(courses.map((c) => [c.code, c]));
    const teacherByEmail = new Map(teachers.map((t) => [t.email ?? "", t]));
    const roomByCode = new Map(rooms.map((r) => [r.code, r]));

    const termPairs = Array.from(new Set(parsed.map((p) => `${p.term}||${p.year}`)));
    const termConditions = termPairs.map((key) => {
      const [term, year] = key.split("||");
      return { term, year: Number(year) };
    });
    const terms = termConditions.length
      ? await prisma.term.findMany({
          where: { OR: termConditions },
          select: { id: true, term: true, year: true },
        })
      : [];
    const termByKey = new Map(terms.map((t) => [`${t.term}||${t.year}`, t]));

    for (const row of parsed) {
      if (!teacherByEmail.has(row.teacherEmail)) {
        errors.push({ line: row.line, message: `ไม่พบอาจารย์: ${row.teacherEmail}` });
      }
      if (!roomByCode.has(row.roomCode)) {
        errors.push({ line: row.line, message: `ไม่พบห้อง: ${row.roomCode}` });
      }

      const termKey = `${row.term}||${row.year}`;
      if (!termByKey.has(termKey)) {
        errors.push({ line: row.line, message: `ไม่พบเทอม: ${row.term}/${row.year}` });
      }
    }

    if (errors.length) {
      return NextResponse.json(
        { ok: false, message: "พบข้อผิดพลาดในไฟล์", errors: errors.slice(0, 200) },
        { status: 400 }
      );
    }

    const existingCourseSet = new Set(courses.map((c) => c.code));
    const wouldCreateCourses = courseCodes.filter((c) => !existingCourseSet.has(c)).length;
    const wouldUpdateCourses = courseCodes.length - wouldCreateCourses;

    const rowsWithExistingCourse = parsed
      .map((row) => {
        const course = courseByCode.get(row.courseCode);
        if (!course) return null;
        const termId = termByKey.get(`${row.term}||${row.year}`)?.id;
        return {
          ...row,
          courseId: course.id,
          teacherId: teacherByEmail.get(row.teacherEmail)!.id,
          roomId: roomByCode.get(row.roomCode)!.id,
          termId: termId ?? null,
        };
      })
      .filter(Boolean) as Array<ParsedRow & { courseId: string; teacherId: string; roomId: string; termId: string | null }>;

    let existingSectionMap = new Map<string, string>();
    if (rowsWithExistingCourse.length) {
      const courseIds = Array.from(new Set(rowsWithExistingCourse.map((r) => r.courseId)));
      const teacherIds = Array.from(new Set(rowsWithExistingCourse.map((r) => r.teacherId)));
      const roomIds = Array.from(new Set(rowsWithExistingCourse.map((r) => r.roomId)));
      const dayOfWeeks = Array.from(new Set(rowsWithExistingCourse.map((r) => r.dayOfWeek)));
      const startTimes = Array.from(new Set(rowsWithExistingCourse.map((r) => r.startTime)));
      const endTimes = Array.from(new Set(rowsWithExistingCourse.map((r) => r.endTime)));
      const termIds = Array.from(
        new Set(rowsWithExistingCourse.map((r) => r.termId).filter((id): id is string => !!id))
      );

      const existingSections = await prisma.section.findMany({
        where: {
          courseId: { in: courseIds },
          teacherId: { in: teacherIds },
          roomId: { in: roomIds },
          dayOfWeek: { in: dayOfWeeks },
          startTime: { in: startTimes },
          endTime: { in: endTimes },
          termId: { in: termIds },
        },
        select: {
          id: true,
          courseId: true,
          teacherId: true,
          roomId: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          termId: true,
        },
      });

      existingSectionMap = new Map(
        existingSections.map((s) => [
          makeSectionKey({
            courseId: s.courseId,
            teacherId: s.teacherId,
            roomId: s.roomId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            termId: s.termId ?? null,
          }),
          s.id,
        ])
      );
    }

    let wouldCreateSections = 0;
    let wouldUpdateSections = 0;
    for (const row of parsed) {
      const course = courseByCode.get(row.courseCode);
      if (!course) {
        wouldCreateSections += 1;
        continue;
      }
      const key = makeSectionKey({
        courseId: course.id,
        teacherId: teacherByEmail.get(row.teacherEmail)!.id,
        roomId: roomByCode.get(row.roomCode)!.id,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        termId: termByKey.get(`${row.term}||${row.year}`)?.id ?? null,
      });
      if (existingSectionMap.has(key)) wouldUpdateSections += 1;
      else wouldCreateSections += 1;
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        total: parsed.length,
        wouldCreateCourses,
        wouldUpdateCourses,
        wouldCreateSections,
        wouldUpdateSections,
        sample: parsed.slice(0, 10),
      });
    }

    const uniqueCourseMap = new Map<string, { code: string; name: string }>();
    for (const row of parsed) {
      uniqueCourseMap.set(row.courseCode, { code: row.courseCode, name: row.courseName });
    }

    await prisma.$transaction(
      Array.from(uniqueCourseMap.values()).map((c) =>
        prisma.course.upsert({
          where: { code: c.code },
          create: { code: c.code, name: c.name },
          update: { name: c.name },
        })
      )
    );

    const coursesAfter = await prisma.course.findMany({
      where: { code: { in: courseCodes } },
      select: { id: true, code: true },
    });
    const courseIdByCode = new Map(coursesAfter.map((c) => [c.code, c.id]));

    const rowsResolved = parsed.map((row) => ({
      ...row,
      courseId: courseIdByCode.get(row.courseCode)!,
      teacherId: teacherByEmail.get(row.teacherEmail)!.id,
      roomId: roomByCode.get(row.roomCode)!.id,
      termId: termByKey.get(`${row.term}||${row.year}`)?.id ?? null,
    }));

    const courseIdsAll = Array.from(new Set(rowsResolved.map((r) => r.courseId)));
    const teacherIdsAll = Array.from(new Set(rowsResolved.map((r) => r.teacherId)));
    const roomIdsAll = Array.from(new Set(rowsResolved.map((r) => r.roomId)));
    const dayOfWeeksAll = Array.from(new Set(rowsResolved.map((r) => r.dayOfWeek)));
    const startTimesAll = Array.from(new Set(rowsResolved.map((r) => r.startTime)));
    const endTimesAll = Array.from(new Set(rowsResolved.map((r) => r.endTime)));
    const termIdsAll = Array.from(
      new Set(rowsResolved.map((r) => r.termId).filter((id): id is string => !!id))
    );

    const existingSectionsAll = await prisma.section.findMany({
      where: {
        courseId: { in: courseIdsAll },
        teacherId: { in: teacherIdsAll },
        roomId: { in: roomIdsAll },
        dayOfWeek: { in: dayOfWeeksAll },
        startTime: { in: startTimesAll },
        endTime: { in: endTimesAll },
        termId: { in: termIdsAll },
      },
      select: {
        id: true,
        courseId: true,
        teacherId: true,
        roomId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        termId: true,
      },
    });

    const existingSectionMapAll = new Map(
      existingSectionsAll.map((s) => [
        makeSectionKey({
          courseId: s.courseId,
          teacherId: s.teacherId,
          roomId: s.roomId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          termId: s.termId ?? null,
        }),
        s.id,
      ])
    );

    const ops = rowsResolved.map((row) => {
      const key = makeSectionKey({
        courseId: row.courseId,
        teacherId: row.teacherId,
        roomId: row.roomId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        termId: row.termId ?? null,
      });
      const existingId = existingSectionMapAll.get(key);
      if (existingId) {
        return prisma.section.update({
          where: { id: existingId },
          data: {
            courseId: row.courseId,
            teacherId: row.teacherId,
            roomId: row.roomId,
            dayOfWeek: row.dayOfWeek,
            startTime: row.startTime,
            endTime: row.endTime,
            termId: row.termId ?? null,
            isActive: row.isActive,
          },
        });
      }
      return prisma.section.create({
        data: {
          courseId: row.courseId,
          teacherId: row.teacherId,
          roomId: row.roomId,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          termId: row.termId ?? null,
          isActive: row.isActive,
        },
      });
    });

    await prisma.$transaction(ops);

    const createdCourses = wouldCreateCourses;
    const updatedCourses = wouldUpdateCourses;
    const createdSections = wouldCreateSections;
    const updatedSections = wouldUpdateSections;

    return NextResponse.json({
      ok: true,
      dryRun: false,
      total: parsed.length,
      createdCourses,
      updatedCourses,
      createdSections,
      updatedSections,
    });
  } catch (e: any) {
    console.error("[IMPORT_TERM_ERROR]", e);
    const message = e?.message || (typeof e === "string" ? e : "Internal Server Error");
    const prismaCode = e?.code || e?.name || null;
    return NextResponse.json({ ok: false, message, prismaCode }, { status: 500 });
  }
}







