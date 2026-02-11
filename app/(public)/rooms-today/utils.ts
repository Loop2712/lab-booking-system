export function ymdBangkok(d: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDaysYmd(ymd: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymdBangkok();
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTimeRange(startIso: string, endIso: string) {
  try {
    const start = new Date(startIso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const end = new Date(endIso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    return `${start} - ${end}`;
  } catch {
    return `${startIso} - ${endIso}`;
  }
}
