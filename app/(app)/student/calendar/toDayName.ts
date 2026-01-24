export function toDayName(jsDay: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jsDay] ?? "MON";
}
