import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const HEADERS = [
  "course_code",
  "course_name",
  "teacher_email",
  "room_code",
  "day_of_week",
  "start_time",
  "end_time",
  "term",
  "year",
  "is_active",
];

const SAMPLE_ROWS = [
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "MON",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "TUE",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "WED",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "THU",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "FRI",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "SAT",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
  {
    course_code: "SCS409",
    course_name: "Software Engineering",
    teacher_email: "teacher1@university.ac.th",
    room_code: "LAB01",
    day_of_week: "SUN",
    start_time: "08:00",
    end_time: "10:00",
    term: "1",
    year: "2026",
    is_active: "1",
  },
];

function makeCsv() {
  const lines: string[] = [];
  lines.push(HEADERS.join(","));
  for (const r of SAMPLE_ROWS) {
    const row = HEADERS.map((h) => {
      const v = (r as any)[h] ?? "";
      const s = String(v);
      if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    }).join(",");
    lines.push(row);
  }
  return "\uFEFF" + lines.join("\n");
}

function makeXlsxBuffer() {
  const aoa = [HEADERS, ...SAMPLE_ROWS.map((r) => HEADERS.map((h) => (r as any)[h] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  (ws as any)["!cols"] = [
    { wch: 12 }, // course_code
    { wch: 32 }, // course_name
    { wch: 24 }, // teacher_email
    { wch: 10 }, // room_code
    { wch: 12 }, // day_of_week
    { wch: 10 }, // start_time
    { wch: 10 }, // end_time
    { wch: 8 }, // term
    { wch: 8 }, // year
    { wch: 10 }, // is_active
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "term");
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
        "Content-Disposition": `attachment; filename="term-template.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = makeCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="term-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
