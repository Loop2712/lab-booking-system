import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/db/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

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

const rowSchema = z.object({
  code: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "code ห้ามว่าง"),
  name: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "name ห้ามว่าง"),
  roomNumber: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "roomNumber ห้ามว่าง"),
  floor: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "floor ห้ามว่าง"),
  computerCount: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "computerCount ห้ามว่าง"),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine(
      (v) =>
        v === "" ||
        v === "1" ||
        v === "0" ||
        v.toLowerCase() === "true" ||
        v.toLowerCase() === "false",
      "isActive ต้องเป็น 1/0 หรือ true/false"
    ),
});

type ParsedRow = z.infer<typeof rowSchema> & {
  floorNum: number;
  computerCountNum: number;
  isActiveBool: boolean;
};

function makeRoomKey(roomNumber: string, floor: number) {
  return `${roomNumber}|${floor}`;
}

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

    const required = ["code", "name", "roomnumber", "floor", "computercount"];
    const firstRowKeys = Object.keys(rows[0] ?? {}).map(normalizeKey);
    const missing = required.filter((k) => !firstRowKeys.includes(k));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, message: `ขาดคอลัมน์: ${missing.join(", ")} (ต้องมี code, name, roomNumber, floor, computerCount)` },
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

      const raw = {
        code: get("code"),
        name: get("name"),
        roomNumber: get("roomNumber"),
        floor: get("floor"),
        computerCount: get("computerCount"),
        isActive: get("isActive"),
      };

      const vr = rowSchema.safeParse(raw);
      if (!vr.success) {
        errors.push({ line: i + 2, message: vr.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" });
        continue;
      }

      const floorNum = Number(vr.data.floor);
      if (!Number.isInteger(floorNum) || floorNum < 0) {
        errors.push({ line: i + 2, message: "floor ต้องเป็นเลขจำนวนเต็ม >= 0" });
        continue;
      }

      const computerCountNum = Number(vr.data.computerCount);
      if (!Number.isInteger(computerCountNum) || computerCountNum < 0) {
        errors.push({ line: i + 2, message: "computerCount ต้องเป็นเลขจำนวนเต็ม >= 0" });
        continue;
      }

      const isActiveRaw = vr.data.isActive.toLowerCase();
      const isActiveBool = isActiveRaw === "0" || isActiveRaw === "false" ? false : true;

      parsed.push({
        ...vr.data,
        floorNum,
        computerCountNum,
        isActiveBool,
      });
    }

    const seenCode = new Set<string>();
    const seenRoom = new Set<string>();
    for (const p of parsed) {
      if (seenCode.has(p.code)) errors.push({ line: -1, message: `code ซ้ำในไฟล์: ${p.code}` });
      seenCode.add(p.code);

      const key = makeRoomKey(p.roomNumber, p.floorNum);
      if (seenRoom.has(key)) {
        errors.push({ line: -1, message: `roomNumber/floor ซ้ำในไฟล์: ${p.roomNumber} ชั้น ${p.floorNum}` });
      }
      seenRoom.add(key);
    }

    if (errors.length) {
      return NextResponse.json({ ok: false, message: "พบข้อผิดพลาดในไฟล์", errors: errors.slice(0, 200) }, { status: 400 });
    }

    const codes = parsed.map((p) => p.code);
    const existingByCode = await prisma.room.findMany({
      where: { code: { in: codes } },
      select: { code: true, roomNumber: true, floor: true },
    });

    const uniqueCombos = new Map<string, { roomNumber: string; floor: number }>();
    for (const p of parsed) {
      const key = makeRoomKey(p.roomNumber, p.floorNum);
      if (!uniqueCombos.has(key)) uniqueCombos.set(key, { roomNumber: p.roomNumber, floor: p.floorNum });
    }

    const comboList = Array.from(uniqueCombos.values());
    const existingByCombo = comboList.length
      ? await prisma.room.findMany({
          where: { OR: comboList.map((c) => ({ roomNumber: c.roomNumber, floor: c.floor })) },
          select: { code: true, roomNumber: true, floor: true },
        })
      : [];

    const existingComboMap = new Map<string, string>();
    for (const r of existingByCombo) {
      existingComboMap.set(makeRoomKey(r.roomNumber, r.floor), r.code);
    }

    for (const p of parsed) {
      const key = makeRoomKey(p.roomNumber, p.floorNum);
      const existingCode = existingComboMap.get(key);
      if (existingCode && existingCode !== p.code) {
        errors.push({
          line: -1,
          message: `roomNumber/floor ซ้ำกับห้องที่มีอยู่แล้ว: ${p.roomNumber} ชั้น ${p.floorNum} (code: ${existingCode})`,
        });
      }
    }

    if (errors.length) {
      return NextResponse.json({ ok: false, message: "พบข้อผิดพลาดในไฟล์", errors: errors.slice(0, 200) }, { status: 400 });
    }

    const existingSet = new Set(existingByCode.map((r) => r.code));
    const wouldCreate = parsed.filter((p) => !existingSet.has(p.code)).length;
    const wouldUpdate = parsed.length - wouldCreate;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        total: parsed.length,
        wouldCreate,
        wouldUpdate,
        sample: parsed.slice(0, 10).map((p) => ({
          code: p.code,
          name: p.name,
          roomNumber: p.roomNumber,
          floor: p.floorNum,
          computerCount: p.computerCountNum,
          isActive: p.isActiveBool,
        })),
      });
    }

    await prisma.$transaction(
      parsed.map((p) =>
        prisma.room.upsert({
          where: { code: p.code },
          create: {
            code: p.code,
            name: p.name,
            roomNumber: p.roomNumber,
            floor: p.floorNum,
            computerCount: p.computerCountNum,
            isActive: p.isActiveBool,
          },
          update: {
            name: p.name,
            roomNumber: p.roomNumber,
            floor: p.floorNum,
            computerCount: p.computerCountNum,
            isActive: p.isActiveBool,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      dryRun: false,
      total: parsed.length,
      created: wouldCreate,
      updated: wouldUpdate,
    });
  } catch (e: any) {
    console.error("[IMPORT_ROOMS_ERROR]", e);
    const message = e?.message || (typeof e === "string" ? e : "Internal Server Error");
    const prismaCode = e?.code || e?.name || null;
    return NextResponse.json({ ok: false, message, prismaCode }, { status: 500 });
  }
}
