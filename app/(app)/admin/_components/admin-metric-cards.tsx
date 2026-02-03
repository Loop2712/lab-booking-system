import type { ReactNode } from "react";
import { IconClock, IconDoor, IconKey, IconListCheck } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import type { AdminDashboardMetrics } from "../_data/dashboard-metrics";

type MetricCard = {
  title: string;
  value: number;
  description: string;
  badge: string;
  icon: ReactNode;
};

export default function AdminMetricCards({ metrics }: { metrics: AdminDashboardMetrics }) {
  const items: MetricCard[] = [
    {
      title: "คำขอรออนุมัติ",
      value: metrics.pendingRequests,
      description: "รายการที่รอการอนุมัติจากแอดมิน",
      badge: "PENDING",
      icon: <IconListCheck className="size-4" />,
    },
    {
      title: "รอรับกุญแจ",
      value: metrics.pendingCheckin,
      description: "อนุมัติแล้วแต่ยังไม่รับกุญแจ",
      badge: "APPROVED",
      icon: <IconClock className="size-4" />,
    },
    {
      title: "กำลังใช้งาน",
      value: metrics.activeLoans,
      description: "รายการที่เช็กอินแล้วกำลังใช้งาน",
      badge: "CHECKED_IN",
      icon: <IconKey className="size-4" />,
    },
    {
      title: "ห้องที่เปิดใช้งาน",
      value: metrics.roomsActive,
      description: "จำนวนห้องที่พร้อมให้จอง",
      badge: "ROOM",
      icon: <IconDoor className="size-4" />,
    },
    {
      title: "กุญแจว่าง",
      value: metrics.keysAvailable,
      description: "กุญแจที่ยังพร้อมให้ยืม",
      badge: "AVAILABLE",
      icon: <IconKey className="size-4" />,
    },
    {
      title: "กุญแจถูกยืม",
      value: metrics.keysBorrowed,
      description: "กุญแจที่อยู่ระหว่างการใช้งาน",
      badge: "BORROWED",
      icon: <IconKey className="size-4" />,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title} className="@container/card">
          <CardHeader>
            <CardDescription>{item.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1">
                {item.icon}
                {item.badge}
              </Badge>
            </CardAction>
            <div className="text-xs text-muted-foreground">{item.description}</div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
