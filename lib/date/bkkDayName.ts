import type { DayName } from "@/lib/date/toDayName";

export function bkkDayName(ymd: string): DayName {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
  }).format(d);
  const map: Record<string, DayName> = {
    Sun: "SUN",
    Mon: "MON",
    Tue: "TUE",
    Wed: "WED",
    Thu: "THU",
    Fri: "FRI",
    Sat: "SAT",
  };
  return map[weekday] ?? "MON";
}
