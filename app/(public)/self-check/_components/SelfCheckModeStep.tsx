"use client";

import type { Mode } from "../types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  mode: Mode | "";
  onModeChange: (mode: Mode | "") => void;
};

const OPTIONS: Array<{
  value: Mode;
  title: string;
  description: string;
}> = [
  {
    value: "CHECKIN",
    title: "ยืมกุญแจ",
    description: "ใช้เมื่อมีรายการจองที่อนุมัติแล้วและต้องการรับกุญแจห้อง",
  },
  {
    value: "RETURN",
    title: "คืนกุญแจ",
    description: "ใช้เมื่อผู้ใช้ถือกุญแจอยู่และต้องการปิดรายการให้เสร็จสมบูรณ์",
  },
];

export default function SelfCheckModeStep({ mode, onModeChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-stone-900">ขั้นตอน 1: เลือกโหมดการทำรายการ</div>
        <div className="text-xs text-muted-foreground">เลือกให้ตรงกับสิ่งที่ผู้ใช้ต้องการทำที่หน้าเครื่อง</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left transition-colors",
                active ? "border-stone-900 bg-stone-900 text-white" : "bg-white hover:border-stone-400"
              )}
            >
              <div className="font-semibold">{option.title}</div>
              <div className={cn("mt-2 text-sm", active ? "text-stone-200" : "text-muted-foreground")}>
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      {mode ? (
        <Button variant="ghost" className="px-0 text-muted-foreground" onClick={() => onModeChange("")}>
          ล้างการเลือก
        </Button>
      ) : null}
    </div>
  );
}
