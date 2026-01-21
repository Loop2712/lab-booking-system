export function getBangkokYMD(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const dd = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${dd}`;
}

export function startOfBangkokDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000+07:00`);
}

export function startOfDayUTC(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDaysUTC(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function bangkokDateTimeToUTC(ymd: string, timeHHmm: string) {
  return new Date(`${ymd}T${timeHHmm}:00+07:00`);
}
