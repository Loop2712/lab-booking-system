const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function prettyDate(d: Date) {
  return fmt.format(d);
}
