export function pickClosestToNow<T extends { startAt: Date }>(items: T[]) {
  if (!items.length) return null;

  const now = Date.now();
  return [...items].sort(
    (left, right) =>
      Math.abs(left.startAt.getTime() - now) - Math.abs(right.startAt.getTime() - now)
  )[0] ?? null;
}
