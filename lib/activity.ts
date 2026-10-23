const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function timestampToDateKey(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

export function startOfUtcDay(date = new Date()): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

/** UTC date keys for the last `days` days, including today, oldest first. */
export function recentDateKeys(days: number): string[] {
  const today = startOfUtcDay();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - 1 - index) * DAY_MS);
    return toDateKey(date);
  });
}

export function sumActivity(
  days: readonly { date: string; count: number }[],
  window: ReadonlySet<string>,
): number {
  let total = 0;

  for (const day of days) {
    if (window.has(day.date)) total += day.count;
  }

  return total;
}
