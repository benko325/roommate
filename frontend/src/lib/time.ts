import { cs, sk } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getLocale } from "@/paraglide/runtime";

// date-fns locales for the app's non-English languages; English is the default.
const DATE_LOCALES = { cs, sk } as const;
const dateLocale = () => DATE_LOCALES[getLocale() as keyof typeof DATE_LOCALES];

/** "HH:mm" of an instant, in the given timezone. */
export const hhmmInTz = (iso: string, tz: string) => formatInTimeZone(new Date(iso), tz, "HH:mm");

/** e.g. "Wed, Aug 5" of an instant, in the given timezone and app language. */
export const dateLabelInTz = (iso: string, tz: string) =>
  formatInTimeZone(new Date(iso), tz, "EEE, MMM d", { locale: dateLocale() });

/** Today's date as yyyy-MM-dd in the given timezone. */
export const todayInTz = (tz: string) => formatInTimeZone(new Date(), tz, "yyyy-MM-dd");

/** A local wall-clock date + "HH:mm" in `tz` → UTC ISO instant. */
export const wallToUtcIso = (date: string, time: string, tz: string) =>
  fromZonedTime(`${date}T${time}:00`, tz).toISOString();

/** UTC ISO bounds for the local day `date` in `tz`. */
export function dayBoundsUtc(date: string, tz: string) {
  return {
    from: fromZonedTime(`${date}T00:00:00`, tz).toISOString(),
    to: fromZonedTime(`${date}T23:59:59.999`, tz).toISOString(),
  };
}

/** The browser's IANA timezone, for defaulting new households. */
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** All IANA timezones the runtime knows (for a selector). */
export function supportedTimezones(): string[] {
  const withValues = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  return withValues.supportedValuesOf?.("timeZone") ?? ["UTC", browserTimezone()];
}
