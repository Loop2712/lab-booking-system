import { ymdBangkok } from "./ymdBangkok";

export function addDaysYmd(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00.000+07:00`);
  d.setDate(d.getDate() + days);
  return ymdBangkok(d);
}
