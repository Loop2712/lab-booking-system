"use client";

import type { CalendarGridDay, CalendarGridEvent } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  days: CalendarGridDay[];
  loading: boolean;
  emptyText?: string;
  onSelect: (event: CalendarGridEvent) => void;
};

export default function WeekEventGrid({ days, loading, emptyText = "List", onSelect }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {days.map((day) => (
        <Card key={day.key} className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{day.title}</span>
              {day.subtitle ? <span className="text-xs text-muted-foreground">{day.subtitle}</span> : null}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <div className="h-10 rounded-md bg-muted animate-pulse" />
                <div className="h-10 rounded-md bg-muted animate-pulse" />
              </div>
            ) : (
              <>
                {day.events.map((event, idx) => (
                  <button
                    key={event.id ?? `${day.key}-${idx}`}
                    className="w-full text-left border rounded-md p-2 hover:bg-muted transition"
                    onClick={() => onSelect(event)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-sm text-muted-foreground">{event.time}</div>
                        <div className="text-xs text-muted-foreground truncate">{event.meta}</div>
                      </div>
                      {event.badge ? (
                        <span className={`shrink-0 border text-xs rounded-full px-2 py-0.5 ${event.badgeClassName ?? ""}`}>
                          {event.badge}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}

                {day.events.length === 0 ? <div className="text-sm text-muted-foreground">{emptyText}</div> : null}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
