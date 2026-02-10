"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ImportForm from "@/components/admin/ImportForm";

type TermItem = {
  id: string;
  term: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default function AdminTermSetupPage() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [defaultTerm, setDefaultTerm] = useState("");
  const [defaultYear, setDefaultYear] = useState("");

  const [terms, setTerms] = useState<TermItem[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [termBusy, setTermBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [termValue, setTermValue] = useState("");
  const [yearValue, setYearValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function runImport(dryRun: boolean) {
    if (!importFile) {
      setImportErr("กรุณาเลือกไฟล์ XLSX/CSV");
      return;
    }
    const yearText = defaultYear.trim();
    if (yearText && !/^\d{4}$/.test(yearText)) {
      setImportErr("ปีการศึกษาต้องเป็นตัวเลข 4 หลัก (เช่น 2026)");
      return;
    }

    setImportBusy(true);
    setImportMsg(null);
    setImportErr(null);

    try {
      const fd = new FormData();
      fd.append("file", importFile);
      if (defaultTerm.trim()) fd.append("defaultTerm", defaultTerm.trim());
      if (yearText) fd.append("defaultYear", yearText);

      const res = await fetch(`/api/admin/term/import?dryRun=${dryRun ? "1" : "0"}`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch {}

      if (!res.ok || !data?.ok) {
        console.error("API ERROR RAW:", text);
        setImportErr(data?.message ?? `HTTP ${res.status}`);
        return;
      }

      if (dryRun) {
        setImportPreview(data);
        setImportMsg(
          `ตรวจสอบผ่าน: ทั้งหมด ${data.total} แถว | วิชาใหม่ ${data.wouldCreateCourses} | วิชาอัปเดต ${data.wouldUpdateCourses} | ` +
          `section ใหม่ ${data.wouldCreateSections} | section อัปเดต ${data.wouldUpdateSections}`
        );
      } else {
        setImportPreview(null);
        setImportMsg(
          `นำเข้าสำเร็จ: ทั้งหมด ${data.total} แถว | วิชาใหม่ ${data.createdCourses} | วิชาอัปเดต ${data.updatedCourses} | ` +
          `section ใหม่ ${data.createdSections} | section อัปเดต ${data.updatedSections}`
        );
      }
    } catch (e: any) {
      setImportPreview(null);
      setImportErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setImportBusy(false);
    }
  }

  async function loadTerms() {
    setTermsLoading(true);
    setTermsError(null);
    try {
      const res = await fetch(`/api/admin/terms${showInactive ? "?includeInactive=1" : ""}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setTermsError(json?.message || "โหลดเทอมไม่สำเร็จ");
        return;
      }
      setTerms(json.items ?? []);
    } finally {
      setTermsLoading(false);
    }
  }

  useEffect(() => {
    loadTerms();
  }, [showInactive]);

  function resetTermForm() {
    setEditId(null);
    setTermValue("");
    setYearValue("");
    setStartDate("");
    setEndDate("");
  }

  async function saveTerm() {
    setTermsError(null);
    const termText = termValue.trim();
    const yearText = yearValue.trim();

    if (!termText) {
      setTermsError("กรุณากรอก term");
      return;
    }
    if (!/^\d{4}$/.test(yearText)) {
      setTermsError("ปีการศึกษาต้องเป็นตัวเลข 4 หลัก (เช่น 2026)");
      return;
    }
    if (!startDate || !endDate) {
      setTermsError("กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด");
      return;
    }
    if (endDate < startDate) {
      setTermsError("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น");
      return;
    }

    setTermBusy(true);
    try {
      const payload = {
        term: termText,
        year: Number(yearText),
        startDate,
        endDate,
      };
      const res = await fetch(editId ? `/api/admin/terms/${editId}` : "/api/admin/terms", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        const msg =
          json?.message === "TERM_YEAR_DUPLICATE"
            ? "มีเทอมและปีนี้อยู่แล้ว"
            : json?.message === "END_DATE_BEFORE_START_DATE"
            ? "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น"
            : json?.message === "TERM_REQUIRED"
            ? "กรุณากรอก term"
            : json?.message || "บันทึกเทอมไม่สำเร็จ";
        setTermsError(msg);
        return;
      }
      resetTermForm();
      await loadTerms();
    } finally {
      setTermBusy(false);
    }
  }

  function startEditTerm(t: TermItem) {
    setEditId(t.id);
    setTermValue(t.term);
    setYearValue(String(t.year));
    setStartDate(formatDate(t.startDate));
    setEndDate(formatDate(t.endDate));
  }

  async function toggleTermActive(t: TermItem) {
    setTermsError(null);
    setTermBusy(true);
    try {
      const res = await fetch(`/api/admin/terms/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setTermsError(json?.message || "อัปเดตสถานะเทอมไม่สำเร็จ");
        return;
      }
      await loadTerms();
    } finally {
      setTermBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Term Setup</h1>
        <p className="text-sm text-muted-foreground">
          จัดการช่วงเวลาเทอมและนำเข้ารายวิชา/ตารางสอนด้วยไฟล์เดียว
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">จัดการเทอม</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Input
              placeholder="term (เช่น 1 / 2 / SUMMER)"
              value={termValue}
              onChange={(e) => setTermValue(e.target.value)}
            />
            <Input
              placeholder="year (เช่น 2026)"
              value={yearValue}
              onChange={(e) => setYearValue(e.target.value)}
            />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={saveTerm} disabled={termBusy}>
              {editId ? "บันทึกการแก้ไข" : "เพิ่มเทอม"}
            </Button>
            {editId ? (
              <Button variant="outline" onClick={resetTermForm} disabled={termBusy}>
                ยกเลิกการแก้ไข
              </Button>
            ) : null}
            <div className="flex items-center gap-2 ml-auto">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} />
              <span className="text-sm">แสดงเทอมที่ปิดใช้งาน</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            เทอมที่หมดช่วงเวลา ระบบจะปิดใช้งานอัตโนมัติและไม่แสดงในรายการ (ยกเว้นเลือกแสดงเทอมที่ปิดใช้งาน)
          </div>

          {termsError && (
            <div className="text-sm text-red-600 whitespace-pre-wrap">
              {termsError}
            </div>
          )}

          <div className="rounded-2xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เทอม</TableHead>
                  <TableHead>ช่วงเวลา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : terms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      ยังไม่มีข้อมูลเทอม
                    </TableCell>
                  </TableRow>
                ) : (
                  terms.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.term}</div>
                        <div className="text-xs text-muted-foreground">ปี {t.year}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(t.startDate)} - {formatDate(t.endDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.isActive ? "default" : "secondary"}>
                          {t.isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={termBusy}
                            onClick={() => {
                              setDefaultTerm(t.term);
                              setDefaultYear(String(t.year));
                            }}
                          >
                            ใช้เป็นค่าเริ่มต้น
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={termBusy}
                            onClick={() => startEditTerm(t)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant={t.isActive ? "destructive" : "secondary"}
                            size="sm"
                            disabled={termBusy}
                            onClick={() => toggleTermActive(t)}
                          >
                            {t.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">นำเข้าเทอม (XLSX/CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            คอลัมน์ที่ต้องมี:{" "}
            <span className="font-mono">
              course_code, course_name, teacher_email, room_code, day_of_week, start_time, end_time
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            คอลัมน์ทางเลือก:{" "}
            <span className="font-mono">term, year, is_active</span>
          </div>

          <ImportForm
            title="Import Term (XLSX/CSV)"
            templateHref="/api/admin/term/template?format=xlsx"
            file={importFile}
            onFileChange={(f) => {
              setImportFile(f);
              setImportPreview(null);
              setImportMsg(null);
              setImportErr(null);
            }}
            onDryRun={() => runImport(true)}
            onImport={() => runImport(false)}
            busy={importBusy}
            preview={importPreview}
            message={importMsg}
            error={importErr}
            extra={
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="ค่าเริ่มต้น term (เช่น 1 / 2 / SUMMER)"
                  value={defaultTerm}
                  onChange={(e) => setDefaultTerm(e.target.value)}
                />
                <Input
                  placeholder="ค่าเริ่มต้น year (เช่น 2026)"
                  value={defaultYear}
                  onChange={(e) => setDefaultYear(e.target.value)}
                />
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
