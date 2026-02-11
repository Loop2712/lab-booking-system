"use client";

import type { Mode } from "../types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Props = {
  mode: Mode | "";
  onModeChange: (mode: Mode | "") => void;
};

export default function SelfCheckModeStep({ mode, onModeChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">ขั้นตอน 1: เลือกโหมด</div>
      <ToggleGroup type="single" value={mode} onValueChange={(v) => onModeChange(v as Mode | "")} variant="outline" size="sm" className="grid w-full grid-cols-2">
        <ToggleGroupItem value="CHECKIN" className="w-full">
          ยืมกุญแจ (Check-in)
        </ToggleGroupItem>
        <ToggleGroupItem value="RETURN" className="w-full">
          คืนกุญแจ (Check-out)
        </ToggleGroupItem>
      </ToggleGroup>
      {!mode ? <div className="text-xs text-muted-foreground">กรุณาเลือกโหมดก่อนจึงจะสแกนผู้ใช้ได้</div> : null}
    </div>
  );
}
