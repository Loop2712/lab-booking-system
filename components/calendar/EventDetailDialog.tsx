"use client";

import type { CalendarGridEvent } from "./types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarGridEvent | null;
  title?: string;
  emptyText?: string;
};

export default function EventDetailDialog({ open, onOpenChange, event, title = "Event details", emptyText = "No selection" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {event ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{event.title}</div>
              {event.badge ? <span className={`border text-xs rounded-full px-2 py-0.5 ${event.badgeClassName ?? ""}`}>{event.badge}</span> : null}
            </div>

            <div className="text-sm">
              <div className="text-muted-foreground">Time</div>
              <div>{event.time}</div>
            </div>

            <div className="text-sm">
              <div className="text-muted-foreground">Info</div>
              <div>{event.meta}</div>
            </div>

            {event.id ? <div className="text-xs text-muted-foreground break-all">id: {event.id}</div> : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
