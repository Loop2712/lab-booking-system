"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  weekLabel: string;
  loading: boolean;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onRefresh: () => Promise<void> | void;
  refreshLabel?: string;
  todayLabel?: string;
  summary?: ReactNode;
};

export default function WeekRangeHeader({
  title,
  weekLabel,
  loading,
  onPrev,
  onToday,
  onNext,
  onRefresh,
  refreshLabel = "Refresh",
  todayLabel = "Today",
  summary,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="text-sm text-muted-foreground">{weekLabel}</div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onPrev} disabled={loading}>
            ←
          </Button>
          <Button variant="secondary" onClick={onToday} disabled={loading}>
            {todayLabel}
          </Button>
          <Button variant="outline" onClick={onNext} disabled={loading}>
            →
          </Button>
          <Button variant="default" onClick={onRefresh} disabled={loading}>
            {loading ? "Loading..." : refreshLabel}
          </Button>
        </div>
      </CardHeader>

      {summary ? <CardContent className="text-sm text-muted-foreground">{summary}</CardContent> : null}
    </Card>
  );
}
