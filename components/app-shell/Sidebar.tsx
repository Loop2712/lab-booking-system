"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem, IconKey } from "./nav";
import {
  LayoutDashboard,
  KeyRound,
  CalendarDays,
  Users,
  Settings,
  BadgeCheck,
} from "lucide-react";

const ICONS: Record<IconKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  key: KeyRound,
  calendar: CalendarDays,
  users: Users,
  settings: Settings,
  approve: BadgeCheck,
};

export default function Sidebar({
  nav,
  headerTitle,
}: {
  nav: NavItem[];
  headerTitle: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-background">
      <div className="h-14 flex items-center px-4 border-b">
        <span className="font-semibold">{headerTitle}</span>
      </div>

      <nav className="p-2 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
