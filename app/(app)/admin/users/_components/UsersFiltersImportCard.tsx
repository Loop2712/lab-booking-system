"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImportForm from "@/components/admin/ImportForm";

type Props = {
  q: string;
  active: "1" | "0" | "all";
  busy: boolean;
  onQChange: (value: string) => void;
  onActiveChange: (value: "1" | "0" | "all") => void;
  onRefresh: () => Promise<void>;
  csvFile: File | null;
  importBusy: boolean;
  importPreview: any;
  importMsg: string | null;
  importErr: string | null;
  onFileChange: (file: File | null) => void;
  onDryRun: () => Promise<void>;
  onImport: () => Promise<void>;
};

export default function UsersFiltersImportCard({
  q,
  active,
  busy,
  onQChange,
  onActiveChange,
  onRefresh,
  csvFile,
  importBusy,
  importPreview,
  importMsg,
  importErr,
  onFileChange,
  onDryRun,
  onImport,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ค้นหา / ตัวกรอง และนำเข้า</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="text-sm font-semibold">ค้นหา / ตัวกรอง</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="ค้นหา: ชื่อ/นามสกุล/รหัสนักศึกษา/email"
                value={q}
                onChange={(e) => onQChange(e.target.value)}
              />

              <Select value={active} onValueChange={(v) => onActiveChange(v as "1" | "0" | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">ใช้งาน</SelectItem>
                  <SelectItem value="0">ปิดใช้งาน</SelectItem>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onRefresh} disabled={busy}>
                  รีเฟรช
                </Button>
              </div>
            </div>
          </div>

          <ImportForm
            title="Import Student (XLSX/CSV)"
            formatHint={
              <>
                รูปแบบไฟล์: <span className="font-mono">studentId, firstName, lastName</span>{" "}
                (ถ้าไม่ระบุ birthDate ระบบจะตั้งเป็น <span className="font-mono">2000-01-01</span> | รหัสผ่านเริ่มต้นนักศึกษา ={" "}
                <span className="font-mono">studentId</span>)
              </>
            }
            templateHref="/api/admin/users/template?format=xlsx"
            file={csvFile}
            onFileChange={onFileChange}
            onDryRun={onDryRun}
            onImport={onImport}
            busy={importBusy}
            preview={importPreview}
            message={importMsg}
            error={importErr}
          />
        </div>
      </CardContent>
    </Card>
  );
}
