export function plusDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}
