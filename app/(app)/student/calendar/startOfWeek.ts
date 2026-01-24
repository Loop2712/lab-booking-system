export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 sun
  const diff = (day === 0 ? -6 : 1) - day; // monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
