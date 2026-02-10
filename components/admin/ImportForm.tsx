"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  formatHint?: ReactNode;
  accept?: string;
  templateHref?: string;
  templateLabel?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onDryRun: () => void;
  onImport: () => void;
  busy: boolean;
  preview: any | null;
  message?: string | null;
  error?: string | null;
  sampleTitle?: string;
  extra?: ReactNode;
};

export default function ImportForm({
  title,
  formatHint,
  accept = ".xlsx,.xls,.csv,text/csv",
  templateHref,
  templateLabel = "ดาวน์โหลดเทมเพลต (XLSX)",
  file,
  onFileChange,
  onDryRun,
  onImport,
  busy,
  preview,
  message,
  error,
  sampleTitle = "ตัวอย่าง 10 แถวแรก (ผลการอ่านไฟล์)",
  extra,
}: Props) {
  return (
    <div className="space-y-3">
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {formatHint ? <div className="text-sm text-muted-foreground">{formatHint}</div> : null}
      {extra ? <div className="space-y-3">{extra}</div> : null}

      <Input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileChange(f);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button disabled={!file || busy} onClick={onDryRun}>
          {busy ? "กำลังทำงาน..." : "ตรวจสอบไฟล์ (Dry-run)"}
        </Button>
        <Button
          variant="secondary"
          disabled={!file || busy || !preview}
          onClick={onImport}
          title={!preview ? "ต้องกด Dry-run ให้ผ่านก่อน" : ""}
        >
          {busy ? "กำลังนำเข้า..." : "นำเข้า (Upsert)"}
        </Button>
        {templateHref ? (
          <Button asChild variant="outline">
            <Link href={templateHref}>{templateLabel}</Link>
          </Button>
        ) : null}
      </div>

      {message && <div className="text-sm text-green-600">{message}</div>}
      {error && (
        <div className="text-sm text-red-600 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {preview?.sample?.length ? (
        <div className="pt-2">
          <div className="text-sm font-semibold mb-2">{sampleTitle}</div>
          <div className="overflow-auto border rounded-md">
            <pre className="text-xs p-3">{JSON.stringify(preview.sample, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
