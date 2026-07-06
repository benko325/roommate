import { localDayEnd, localDayStart, localMinutesOfDay, localParts } from './timezone';

const HOUR_MS = 3_600_000;

describe('timezone helpers', () => {
  const TZ = 'Europe/Bratislava'; // UTC+1 in winter, UTC+2 in summer

  describe('localParts', () => {
    it('converts a UTC instant to wall-clock parts in the timezone', () => {
      // 2026-07-06 06:30 UTC = 08:30 in Bratislava (CEST).
      const parts = localParts(new Date('2026-07-06T06:30:00.000Z'), TZ);
      expect(parts).toEqual({
        year: 2026,
        month: 7,
        day: 6,
        hour: 8,
        minute: 30,
      });
    });

    it('normalizes midnight (Intl may emit hour "24")', () => {
      // 22:00 UTC in summer = 00:00 next day in Bratislava.
      const parts = localParts(new Date('2026-07-06T22:00:00.000Z'), TZ);
      expect(parts.hour).toBe(0);
      expect(parts.day).toBe(7);
    });

    it('crosses the date line relative to UTC', () => {
      // 23:30 UTC = 01:30 next local day.
      const parts = localParts(new Date('2026-07-06T23:30:00.000Z'), TZ);
      expect(parts).toMatchObject({ day: 7, hour: 1, minute: 30 });
    });
  });

  describe('localMinutesOfDay', () => {
    it('returns minutes since local midnight', () => {
      // 06:30 UTC = 08:30 local.
      expect(localMinutesOfDay(new Date('2026-07-06T06:30:00.000Z'), TZ)).toBe(8 * 60 + 30);
    });

    it('respects the winter offset', () => {
      // 06:30 UTC in January = 07:30 local (CET, UTC+1).
      expect(localMinutesOfDay(new Date('2026-01-06T06:30:00.000Z'), TZ)).toBe(7 * 60 + 30);
    });
  });

  describe('localDayStart / localDayEnd', () => {
    it('bounds an ordinary summer day (24h)', () => {
      const instant = new Date('2026-07-06T12:00:00.000Z');
      const start = localDayStart(instant, TZ);
      const end = localDayEnd(instant, TZ);
      // Local midnight 2026-07-06 in CEST = 2026-07-05 22:00 UTC.
      expect(start.toISOString()).toBe('2026-07-05T22:00:00.000Z');
      expect(end.getTime() - start.getTime()).toBe(24 * HOUR_MS);
    });

    it('handles the spring-forward day (23h)', () => {
      // DST starts 2026-03-29 in the EU: 02:00 CET jumps to 03:00 CEST.
      const instant = new Date('2026-03-29T12:00:00.000Z');
      const start = localDayStart(instant, TZ);
      const end = localDayEnd(instant, TZ);
      expect(end.getTime() - start.getTime()).toBe(23 * HOUR_MS);
    });

    it('handles the fall-back day (25h)', () => {
      // DST ends 2026-10-25 in the EU.
      const instant = new Date('2026-10-25T12:00:00.000Z');
      const start = localDayStart(instant, TZ);
      const end = localDayEnd(instant, TZ);
      expect(end.getTime() - start.getTime()).toBe(25 * HOUR_MS);
    });

    it('rolls over month and year boundaries', () => {
      const instant = new Date('2026-12-31T23:30:00.000Z'); // Jan 1 local
      const end = localDayEnd(instant, TZ);
      expect(end.toISOString()).toBe('2027-01-01T23:00:00.000Z');
    });

    it('an instant just before local midnight belongs to the earlier day', () => {
      // 21:59 UTC = 23:59 local on Jul 6.
      const start = localDayStart(new Date('2026-07-06T21:59:00.000Z'), TZ);
      expect(start.toISOString()).toBe('2026-07-05T22:00:00.000Z');
    });
  });
});
