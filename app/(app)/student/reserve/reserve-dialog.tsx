"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReserveForm, { type RoomItem } from "./reserve-form";

type ReserveDialogProps = {
  rooms: RoomItem[];
  label?: string;
  title?: string;
};

export default function ReserveDialog({
  rooms,
  label = "จองห้อง",
  title = "ฟอร์มจองห้อง",
}: ReserveDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ReserveForm rooms={rooms} />
      </DialogContent>
    </Dialog>
  );
}
