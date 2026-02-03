import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { requireApiRole } from "@/lib/auth/api-guard";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const HEADERS = ["code", "name"];

const SAMPLE_ROWS = [
  { code: "SCS409", name: "Software Engineering" },
  { code: "SCS401", name: "Database Systems" },
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
    { wch: 10 }, // code
    { wch: 32 }, // name
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "courses");
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
        "Content-Disposition": `attachment; filename="courses-template.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = makeCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="courses-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
