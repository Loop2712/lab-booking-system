import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type DashboardHeroMeta = {
  label: string;
  value: string | number;
  icon: LucideIcon;
};

export function DashboardHero({
  badge,
  title,
  description,
  meta,
  asideTitle,
  asideDescription,
  aside,
}: {
  badge: string;
  title: string;
  description: string;
  meta: ReadonlyArray<DashboardHeroMeta>;
  asideTitle: string;
  asideDescription?: string;
  aside: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-[var(--brand-line-green)] bg-gradient-to-br from-[var(--brand-light-green)]/90 via-white to-[var(--brand-bg)] shadow-sm">
      <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <div className="inline-flex w-fit items-center rounded-full border border-[var(--brand-line-green)] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--brand-gray-dark)]">
            {badge}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand-gray-dark)]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {meta.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm"
              >
                <div className="mb-3 inline-flex rounded-xl bg-[var(--brand-light-green)] p-2 text-[var(--brand-primary)]">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--brand-gray-dark)]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--brand-gray-dark)]">
              {asideTitle}
            </div>
            {asideDescription ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {asideDescription}
              </p>
            ) : null}
          </div>
          <div className="mt-4">{aside}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type DashboardMetricTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "danger";

export type DashboardMetricItem = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: DashboardMetricTone;
};

function toneClass(tone: DashboardMetricTone = "neutral") {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "info":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function DashboardMetricGrid({
  title,
  description,
  items,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-3",
}: {
  title: string;
  description?: string;
  items: DashboardMetricItem[];
  columnsClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("grid gap-4", columnsClassName)}>
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-[var(--brand-light-gray-line)] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{item.title}</div>
                <div className="text-3xl font-semibold tracking-tight text-[var(--brand-gray-dark)]">
                  {item.value}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-3 shadow-sm",
                  toneClass(item.tone)
                )}
              >
                <item.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-sm leading-6 text-muted-foreground">
              {item.description}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export type DashboardActionItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function DashboardActionGrid({
  title,
  description,
  items,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-3",
}: {
  title: string;
  description?: string;
  items: DashboardActionItem[];
  columnsClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("grid gap-4", columnsClassName)}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-[var(--brand-light-gray-line)] bg-white p-4 shadow-sm transition hover:border-[var(--brand-line-green)] hover:bg-[var(--brand-light-green)]/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-[var(--brand-light-green)] p-3 text-[var(--brand-primary)]">
                <item.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary)]" />
            </div>
            <div className="mt-4 text-base font-semibold text-[var(--brand-gray-dark)]">
              {item.title}
            </div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
