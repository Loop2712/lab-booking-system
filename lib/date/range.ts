import { ymd } from "@/lib/date/ymd";

export function todayYmdBkk(now = new Date()) {
  const bkk = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bkk.setHours(0, 0, 0, 0);
  return ymd(bkk); // => "YYYY-MM-DD"
}

export function addDaysYmd(ymdStr: string, days: number) {
  const d = new Date(`${ymdStr}T00:00:00+07:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function isYmdBetweenInclusive(target: string, min: string, max: string) {
  return target >= min && target <= max;
}
