"use client";

import { useId, useState } from "react";
import jsQR from "jsqr";
import { CheckCircle2, ImageUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  buttonLabel?: string;
  className?: string;
  disabled?: boolean;
  onDecoded: (value: string) => Promise<void> | void;
};

const MAX_DIMENSION = 1800;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพนี้ได้"));
    };

    image.src = objectUrl;
  });
}

async function decodeQrFromFile(file: File) {
  const image = await loadImage(file);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("เบราว์เซอร์ไม่รองรับการอ่านรูปภาพสำหรับถอดรหัส QR");
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, {
    inversionAttempts: "attemptBoth",
  });

  const value = result?.data?.trim();
  if (!value) {
    throw new Error("ไม่พบ QR Code ในรูปนี้ กรุณาใช้ภาพที่เห็น QR ชัดเจน");
  }

  return value;
}

export default function QrImageUploadField({
  title = "อัปโหลดรูป QR",
  description = "ใช้รูป screenshot หรือรูปถ่าย QR เพื่อกรอก token ให้อัตโนมัติ",
  buttonLabel = "เลือกไฟล์รูปภาพ",
  className,
  disabled = false,
  onDecoded,
}: Props) {
  const inputId = useId();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(file: File | null) {
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setMessage(null);
    setError(null);

    try {
      const decoded = await decodeQrFromFile(file);
      await onDecoded(decoded);
      setMessage("อ่าน QR จากรูปสำเร็จแล้ว");
    } catch (e: any) {
      setError(e?.message || "อัปโหลดรูป QR ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border border-dashed bg-stone-50/80 p-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-stone-900">{title}</div>
          <div className="text-xs text-stone-600">{description}</div>
          {fileName ? <div className="text-xs text-stone-500">ไฟล์ล่าสุด: {fileName}</div> : null}
        </div>

        <Button asChild variant="outline" disabled={disabled || loading} className="shrink-0">
          <label htmlFor={inputId}>
            {loading ? <LoaderCircle className="animate-spin" /> : <ImageUp />}
            {loading ? "กำลังอ่านรูป..." : buttonLabel}
          </label>
        </Button>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || loading}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleSelect(file);
          event.currentTarget.value = "";
        }}
      />

      {message ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <CheckCircle2 className="size-4" />
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
