const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True only for real calendar dates in strict YYYY-MM-DD form. */
export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function assertValidDate(s: string): void {
  if (!isValidDate(s)) {
    throw new Error(`invalid date "${s}". expected YYYY-MM-DD (e.g. 2026-10-07)`);
  }
}

/** Today's date in the machine's local timezone (not UTC). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local weekday (0=Sunday) of a validated YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  assertValidDate(date);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
