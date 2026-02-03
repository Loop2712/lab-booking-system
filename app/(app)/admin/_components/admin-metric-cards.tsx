import type { ReactNode } from "react";
import { IconClock, IconDoor, IconKey, IconListCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminDashboardMetrics } from "../_data/dashboard-metrics";

type MetricCard = {
  title: string;
  value: number;
  description: string;
  badge: string;
  icon: ReactNode;
  tone: "warning" | "danger" | "success" | "neutral";
  featured?: boolean;
};

export default function AdminMetricCards({ metrics }: { metrics: AdminDashboardMetrics }) {
  const items: MetricCard[] = [
    {
      title: "คำขอรออนุมัติ",
      value: metrics.pendingRequests,
      description: "รายการที่รอการอนุมัติจากแอดมิน",
      badge: "PENDING",
      icon: <IconListCheck className="size-4" />,
      tone: "warning",
      featured: true,
    },
    {
      title: "รอรับกุญแจ",
      value: metrics.pendingCheckin,
      description: "อนุมัติแล้วแต่ยังไม่รับกุญแจ",
      badge: "APPROVED",
      icon: <IconClock className="size-4" />,
      tone: "warning",
    },
    {
      title: "กำลังใช้งาน",
      value: metrics.activeLoans,
      description: "รายการที่เช็กอินแล้วกำลังใช้งาน",
      badge: "CHECKED_IN",
      icon: <IconKey className="size-4" />,
      tone: "danger",
      featured: true,
    },
    {
      title: "ห้องที่เปิดใช้งาน",
      value: metrics.roomsActive,
      description: "จำนวนห้องที่พร้อมให้จอง",
      badge: "ROOM",
      icon: <IconDoor className="size-4" />,
      tone: "neutral",
    },
    {
      title: "กุญแจว่าง",
      value: metrics.keysAvailable,
      description: "กุญแจที่ยังพร้อมให้ยืม",
      badge: "AVAILABLE",
      icon: <IconKey className="size-4" />,
      tone: "success",
    },
    {
      title: "กุญแจถูกยืม",
      value: metrics.keysBorrowed,
      description: "กุญแจที่อยู่ระหว่างการใช้งาน",
      badge: "BORROWED",
      icon: <IconKey className="size-4" />,
      tone: "danger",
    },
  ];

  function badgeTone(tone: MetricCard["tone"]) {
    switch (tone) {
      case "warning":
        return "bg-amber-500/90 text-white";
      case "danger":
        return "bg-rose-600/90 text-white";
      case "success":
        return "bg-emerald-600/90 text-white";
      default:
        return "bg-muted text-foreground";
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-nowrap gap-4">
        {items.map((item) => (
          <Card
            key={item.title}
            className={cn(
              "@container/card flex-none",
              item.featured ? "min-w-[320px]" : "min-w-[240px]"
            )}
          >
            <CardHeader className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <CardDescription className="text-xs">{item.title}</CardDescription>
                <Badge className={cn("h-7 px-3 text-[11px] font-semibold", badgeTone(item.tone))}>
                  {item.icon}
                  {item.badge}
                </Badge>
              </div>
              <CardTitle
                className={cn(
                  "tabular-nums leading-none",
                  item.featured ? "text-[30px]" : "text-2xl"
                )}
              >
                {item.value}
              </CardTitle>
              <div className="text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
