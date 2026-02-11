const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

export function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function timeToMinutesOrZero(value?: string | null) {
  return parseTimeToMinutes(value) ?? 0;
}

export function rangesOverlapByTimeText(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) {
  const aS = timeToMinutesOrZero(aStart);
  const aE = timeToMinutesOrZero(aEnd);
  const bS = timeToMinutesOrZero(bStart);
  const bE = timeToMinutesOrZero(bEnd);
  return aS < bE && aE > bS;
}

export function parseTimeRangeToMinutes(value?: string | null) {
  if (!value) return null;
  const [start, end] = value.split("-");
  if (!start || !end) return null;
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin == null || endMin == null) return null;
  return { startMin, endMin };
}

const BKK_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function minutesFromIsoBangkok(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = BKK_TIME_FORMATTER.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}
