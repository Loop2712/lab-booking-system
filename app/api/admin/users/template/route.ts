import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const HEADERS = [
  "studentId",
  "firstName",
  "lastName",
  "birthDate",
  "gender",
  "major",
  "studentType",
  "isActive",
];

const SAMPLE_ROWS = [
  {
    studentId: "66010000001",
    firstName: "สมชาย",
    lastName: "ใจดี",
    birthDate: "2007-05-14",
    gender: "MALE",
    major: "CS",
    studentType: "REGULAR",
    isActive: "1",
  },
  {
    studentId: "66010000002",
    firstName: "สมหญิง",
    lastName: "ตั้งใจ",
    birthDate: "20061201",
    gender: "FEMALE",
    major: "IT",
    studentType: "SPECIAL",
    isActive: "1",
  },
];

function makeCsv() {
  const lines: string[] = [];
  lines.push(HEADERS.join(","));
  for (const r of SAMPLE_ROWS) {
    const row = HEADERS.map((h) => {
      const v = (r as any)[h] ?? "";
      const s = String(v);
      // escape CSV
      if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    }).join(",");
    lines.push(row);
  }
  // ใส่ BOM ให้ Excel อ่านภาษาไทยสวย ๆ
  return "\uFEFF" + lines.join("\n");
}

function makeXlsxBuffer() {
  const aoa = [HEADERS, ...SAMPLE_ROWS.map((r) => HEADERS.map((h) => (r as any)[h] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ตั้งความกว้างคอลัมน์พอประมาณ
  (ws as any)["!cols"] = [
    { wch: 12 }, // studentId
    { wch: 14 }, // firstName
    { wch: 14 }, // lastName
    { wch: 12 }, // birthDate
    { wch: 10 }, // gender
    { wch: 10 }, // major
    { wch: 12 }, // studentType
    { wch: 8 },  // isActive
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "students");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const guard = requireApiRole(session, ["ADMIN"]);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  if (format === "xlsx") {
    const buf = makeXlsxBuffer();
    const body = new Uint8Array(buf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="students-template.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // default csv
  const csv = makeCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
