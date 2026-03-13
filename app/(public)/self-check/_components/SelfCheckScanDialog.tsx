"use client";

import type { RefObject } from "react";
import type { Room } from "../types";
import QrImageUploadField from "@/components/qr/QrImageUploadField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoom: Room | null;
  ready: boolean;
  token: string;
  tokenRef: RefObject<HTMLInputElement | null>;
  loadingLookup: boolean;
  err: string | null;
  onTokenChange: (value: string) => void;
  onLookup: (token?: string) => void;
  onUploadDecode: (token: string) => Promise<void> | void;
};

export default function SelfCheckScanDialog({
  open,
  onOpenChange,
  selectedRoom,
  ready,
  token,
  tokenRef,
  loadingLookup,
  err,
  onTokenChange,
  onLookup,
  onUploadDecode,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สแกน QR หรือกรอก Token ผู้ใช้</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border bg-stone-50 p-3 text-sm">
            <div className="font-semibold text-stone-900">
              {selectedRoom ? `${selectedRoom.code} ห้อง ${selectedRoom.roomNumber}` : "ค้นหาทุกห้อง"}
            </div>
            <div className="mt-1 text-xs text-stone-600">
              {selectedRoom
                ? `กรองเฉพาะชั้น ${selectedRoom.floor} เพื่อให้ค้นหารายการได้เร็วขึ้น`
                : "หากไม่เลือกห้อง ระบบจะค้นหารายการทั้งหมดของผู้ใช้ในวันนี้"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="self-check-token">QR / Token</Label>
            <Input
              id="self-check-token"
              ref={tokenRef}
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="สแกน QR หรือกรอก token ที่ได้รับ"
              disabled={!ready}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onLookup(e.currentTarget.value);
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              รองรับทั้งการสแกนจากเครื่องอ่านและการพิมพ์ token ด้วยตนเอง
            </div>
          </div>

          <QrImageUploadField
            title="อัปโหลดรูป QR"
            description="ใช้ screenshot หรือรูปถ่าย QR ของผู้ใช้เพื่อค้นหารายการแทนการสแกนสด"
            disabled={!ready || loadingLookup}
            onDecoded={onUploadDecode}
          />
        </div>

        {open && err ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {err}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button onClick={() => onLookup()} disabled={!ready || !token.trim() || loadingLookup}>
            {loadingLookup ? "กำลังค้นหา..." : "ค้นหารายการ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
