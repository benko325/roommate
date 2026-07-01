/**
 * Helpers for PostgreSQL `TIME` columns, which Prisma models as a `Date`
 * anchored to 1970-01-01 UTC. We store/read the time-of-day in UTC so the
 * "HH:MM" round-trips regardless of the server timezone.
 */

/** "HH:MM" → Date at 1970-01-01T<time>Z, or null. */
export function timeStringToDate(hhmm: string | null | undefined): Date | null {
  if (!hhmm) return null;
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** Date (Prisma TIME) → "HH:MM", or null. */
export function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(11, 16);
}

/** Minutes since midnight for an "HH:MM" string. */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
