export type DayName = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export function toDayName(jsDay: number): DayName {
  // JS: 0=Sun ... 6=Sat
  return (["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay] as DayName) ?? "MON";
}
