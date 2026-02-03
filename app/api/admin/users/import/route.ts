import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcrypt";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const DEFAULT_BIRTHDATE_TEXT = "2000-01-01";
const DEFAULT_BIRTHDATE_UTC = new Date(Date.UTC(2000, 0, 1));

// -------------------- utils --------------------
function normalizeKey(k: string) {
  return String(k ?? "").trim().toLowerCase();
}

// CSV parser (รองรับ comma + double quotes)
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

// birthDate รองรับ YYYY-MM-DD หรือ YYYYMMDD
function toUtcDateFromBirthDate(input: string) {
  const s = String(input ?? "").trim();
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const m2 = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  const m = m1 || m2;
  if (!m) return null;

  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

// Excel serial date -> JS Date (UTC)
function excelSerialToUtcDate(serial: number) {
  const d = XLSX.SSF.parse_date_code(serial);
  if (!d || !d.y || !d.m || !d.d) return null;
  return new Date(Date.UTC(d.y, d.m - 1, d.d));
}

// -------------------- validation --------------------
const rowSchema = z.object({
  studentId: z
    .string()
    .transform(v => v.trim())
    .refine(v => /^\d{11}$/.test(v), "studentId ต้องเป็นตัวเลข 11 หลัก"),

  firstName: z
    .string()
    .transform(v => v.trim())
    .refine(v => v.length > 0, "firstName ห้ามว่าง"),

  lastName: z
    .string()
    .transform(v => v.trim())
    .refine(v => v.length > 0, "lastName ห้ามว่าง"),

  birthDate: z
    .string()
    .transform(v => v.trim()),

  gender: z
    .string()
    .optional()
    .transform(v => (v ?? "").trim())
    .refine(
      v => v === "" || ["MALE", "FEMALE", "OTHER"].includes(v),
      "gender ต้องเป็น MALE/FEMALE/OTHER"
    ),

  major: z
    .string()
    .optional()
    .transform(v => (v ?? "").trim()),

  studentType: z
    .string()
    .optional()
    .transform(v => (v ?? "").trim())
    .refine(
      v => v === "" || ["REGULAR", "SPECIAL"].includes(v),
      "studentType ต้องเป็น REGULAR/SPECIAL"
    ),

  isActive: z
    .string()
    .optional()
    .transform(v => (v ?? "").trim())
    .refine(
      v => v === "" || v === "1" || v === "0",
      "isActive ต้องเป็น 1 หรือ 0"
    ),
});


type ParsedRow = z.infer<typeof rowSchema> & { birthDateUtc: Date };

// -------------------- loader --------------------
async function loadRowsFromFile(fileObj: File): Promise<{ rows: Record<string, any>[]; meta: { kind: "xlsx" | "csv" } }> {
  const name = (fileObj.name || "").toLowerCase();

  // XLSX / XLS
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = Buffer.from(await fileObj.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
    return { rows, meta: { kind: "xlsx" } };
  }

  // CSV fallback
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

// -------------------- route --------------------
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const guard = requireApiRole(session, ["ADMIN"]);
    if (!guard.ok) return guard.response;

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, message: "กรุณาอัปโหลดไฟล์ในช่อง file (.csv หรือ .xlsx)" }, { status: 400 });
    }

    const fileObj = file as File;
    const { rows, meta } = await loadRowsFromFile(fileObj);

    if (!rows.length) {
      return NextResponse.json({ ok: false, message: "ไฟล์ว่าง หรือไม่มีข้อมูลแถว" }, { status: 400 });
    }
    if (rows.length > 5000) {
      return NextResponse.json({ ok: false, message: "มากเกินไป (จำกัด 5000 แถว)" }, { status: 400 });
    }

    // map keys (case-insensitive)
    const required = ["studentid", "firstname", "lastname"];
    const firstRowKeys = Object.keys(rows[0] ?? {}).map(normalizeKey);
    const missing = required.filter((k) => !firstRowKeys.includes(k));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, message: `ขาดคอลัมน์: ${missing.join(", ")} (ต้องมี studentId, firstName, lastName)` },
        { status: 400 }
      );
    }

    const parsed: ParsedRow[] = [];
    const errors: Array<{ line: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r0 = rows[i] ?? {};

      // get value by header (case-insensitive)
      const get = (k: string) => {
        const target = normalizeKey(k);
        for (const key of Object.keys(r0)) {
          if (normalizeKey(key) === target) return String(r0[key] ?? "").trim();
        }
        return "";
      };

      const raw = {
        studentId: get("studentId"),
        firstName: get("firstName"),
        lastName: get("lastName"),
        birthDate: get("birthDate"),
        gender: get("gender"),
        major: get("major"),
        studentType: get("studentType"),
        isActive: get("isActive"),
      };

      const vr = rowSchema.safeParse(raw);
      if (!vr.success) {
        errors.push({ line: i + 2, message: vr.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" });
        continue;
      }

      const birthDateText = vr.data.birthDate;
      const hasBirthDate = birthDateText.length > 0;
      let birthDateUtc: Date | null = null;

      if (hasBirthDate) {
        // parse birthDate (string formats)
        birthDateUtc = toUtcDateFromBirthDate(birthDateText);

        // if XLSX: allow Excel serial date
        if (!birthDateUtc && meta.kind === "xlsx") {
          const asNum = Number(birthDateText);
          if (!Number.isNaN(asNum) && asNum > 1000) {
            birthDateUtc = excelSerialToUtcDate(asNum);
          }
        }

        if (!birthDateUtc) {
          errors.push({ line: i + 2, message: "birthDate ต้องเป็น YYYY-MM-DD หรือ YYYYMMDD (หรือเลือกเป็น Date ใน Excel ได้)" });
          continue;
        }
      } else {
        birthDateUtc = DEFAULT_BIRTHDATE_UTC;
      }

      parsed.push({
        ...vr.data,
        birthDate: hasBirthDate ? birthDateText : DEFAULT_BIRTHDATE_TEXT,
        birthDateUtc,
      });
    }

    // duplicate studentId in file
    const seen = new Set<string>();
    for (const p of parsed) {
      if (seen.has(p.studentId)) errors.push({ line: -1, message: `studentId ซ้ำในไฟล์: ${p.studentId}` });
      seen.add(p.studentId);
    }

    if (errors.length) {
      return NextResponse.json({ ok: false, message: "พบข้อผิดพลาดในไฟล์", errors: errors.slice(0, 200) }, { status: 400 });
    }

    // check existing users
    const studentIds = parsed.map((p) => p.studentId);
    const existing = await prisma.user.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, role: true, studentId: true },
    });

    // block if existing user with non-student role
    const bad = existing.filter((u) => u.role !== "STUDENT");
    if (bad.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "มี studentId ที่ชนกับผู้ใช้ที่ไม่ใช่นักศึกษา",
          collisions: bad.map((b) => ({ studentId: b.studentId, role: b.role })),
        },
        { status: 400 }
      );
    }

    const existingSet = new Set(existing.map((u) => u.studentId!));
    const wouldCreate = parsed.filter((p) => !existingSet.has(p.studentId)).length;
    const wouldUpdate = parsed.length - wouldCreate;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        fileType: meta.kind,
        total: parsed.length,
        wouldCreate,
        wouldUpdate,
        sample: parsed.slice(0, 10).map((p) => ({
          studentId: p.studentId,
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          gender: p.gender || null,
          major: p.major || null,
          studentType: p.studentType || null,
          isActive: p.isActive === "0" ? false : true,
        })),
      });
    }

    const hashedRows = await Promise.all(
      parsed.map(async (p) => ({
        p,
        passwordHash: await bcrypt.hash(p.studentId, 10),
      }))
    );

    await prisma.$transaction(
      hashedRows.map(({ p, passwordHash }) =>
        prisma.user.upsert({
          where: { studentId: p.studentId },
          create: {
            role: "STUDENT",
            studentId: p.studentId,
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDateUtc,
            gender: p.gender ? (p.gender as any) : undefined,
            major: p.major ? p.major : undefined,
            studentType: p.studentType ? (p.studentType as any) : undefined,
            isActive: p.isActive === "0" ? false : true,
            passwordHash, // นักศึกษา: รหัสผ่านเริ่มต้น = studentId
          },
          update: {
            role: "STUDENT",
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDateUtc,
            gender: p.gender ? (p.gender as any) : null,
            major: p.major ? p.major : null,
            studentType: p.studentType ? (p.studentType as any) : null,
            isActive: p.isActive === "0" ? false : true,
            passwordHash,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      dryRun: false,
      fileType: meta.kind,
      total: parsed.length,
      created: wouldCreate,
      updated: wouldUpdate,
    });
  } catch (e: any) {
    console.error("[IMPORT_USERS_ERROR]", e);

    const message = e?.message || (typeof e === "string" ? e : "Internal Server Error");
    const prismaCode = e?.code || e?.name || null;

    return NextResponse.json({ ok: false, message, prismaCode }, { status: 500 });
  }
}
