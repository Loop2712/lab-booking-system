const fmt = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function prettyDate(d: Date) {
  return fmt.format(d);
}
