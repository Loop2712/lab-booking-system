/**
 * Returns a new Date representing the start of the week (Monday) in local time.
 */
export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
