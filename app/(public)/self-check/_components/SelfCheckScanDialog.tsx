"use client";

import type { Room } from "../types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RefObject } from "react";

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
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สแกน QR ผู้ใช้</DialogTitle>
        </DialogHeader>

        {selectedRoom ? (
          <div className="rounded-lg border p-3 text-sm">
            <div className="font-medium">
              {selectedRoom.code} • {selectedRoom.roomNumber}
            </div>
            <div className="text-xs text-muted-foreground">ชั้น {selectedRoom.floor}</div>
          </div>
        ) : (
          <div className="rounded-lg border p-3 text-sm text-muted-foreground">ไม่ได้ระบุห้อง ระบบจะค้นหาห้องที่ตรงให้โดยอัตโนมัติ</div>
        )}

        <div className="space-y-1">
          <Label>สแกน QR / ใส่ Token</Label>
          <Input
            ref={tokenRef}
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="สแกน token เพื่อค้นหา"
            disabled={!ready}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLookup(e.currentTarget.value);
            }}
          />
          <div className="text-xs text-muted-foreground">กด Enter เพื่อค้นหา หรือกดปุ่ม “ค้นหา”</div>
        </div>

        {open && err ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{err}</div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button onClick={() => onLookup()} disabled={!ready || !token.trim() || loadingLookup}>
            {loadingLookup ? "กำลังค้นหา..." : "ค้นหา"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
