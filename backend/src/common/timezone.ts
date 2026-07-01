import { fromZonedTime } from 'date-fns-tz';

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Wall-clock parts of an instant as seen in the given IANA timezone. */
export function localParts(date: Date, tz: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return {
    year: Number(m.year),
    month: Number(m.month),
    day: Number(m.day),
    hour: m.hour === '24' ? 0 : Number(m.hour), // Intl can emit "24" at midnight
    minute: Number(m.minute),
  };
}

/** Minutes since local midnight for an instant in `tz`. */
export function localMinutesOfDay(date: Date, tz: string): number {
  const { hour, minute } = localParts(date, tz);
  return hour * 60 + minute;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC instant of local midnight for the local day containing `date`. */
export function localDayStart(date: Date, tz: string): Date {
  const { year, month, day } = localParts(date, tz);
  return fromZonedTime(`${year}-${pad(month)}-${pad(day)}T00:00:00`, tz);
}

/** UTC instant of the next local midnight (end of the local day containing `date`). */
export function localDayEnd(date: Date, tz: string): Date {
  const { year, month, day } = localParts(date, tz);
  const next = new Date(Date.UTC(year, month - 1, day + 1)); // rolls month/year
  const y = next.getUTCFullYear();
  const mo = next.getUTCMonth() + 1;
  const d = next.getUTCDate();
  return fromZonedTime(`${y}-${pad(mo)}-${pad(d)}T00:00:00`, tz);
}
