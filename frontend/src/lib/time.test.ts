import { describe, expect, it } from "vitest";
import { dateLabelInTz, dayBoundsUtc, hhmmInTz, wallToUtcIso } from "./time";

const TZ = "Europe/Bratislava"; // UTC+1 winter, UTC+2 summer

describe("time helpers", () => {
  it("hhmmInTz renders the wall clock of the timezone, not UTC", () => {
    expect(hhmmInTz("2026-07-06T08:00:00.000Z", TZ)).toBe("10:00");
    expect(hhmmInTz("2026-01-06T08:00:00.000Z", TZ)).toBe("09:00"); // winter offset
    expect(hhmmInTz("2026-07-06T08:00:00.000Z", "UTC")).toBe("08:00");
  });

  it("dateLabelInTz rolls to the next day past local midnight", () => {
    // 23:30 UTC = 01:30 local on the following day.
    expect(dateLabelInTz("2026-07-06T23:30:00.000Z", TZ)).toBe("Tue, Jul 7");
    expect(dateLabelInTz("2026-07-06T23:30:00.000Z", "UTC")).toBe("Mon, Jul 6");
  });

  it("wallToUtcIso converts a local wall-clock time to a UTC instant", () => {
    expect(wallToUtcIso("2026-07-06", "10:00", TZ)).toBe("2026-07-06T08:00:00.000Z");
    expect(wallToUtcIso("2026-01-06", "10:00", TZ)).toBe("2026-01-06T09:00:00.000Z");
  });

  it("wallToUtcIso and hhmmInTz round-trip", () => {
    const iso = wallToUtcIso("2026-08-10", "18:45", TZ);
    expect(hhmmInTz(iso, TZ)).toBe("18:45");
  });

  it("dayBoundsUtc spans the local day, shifted by the offset", () => {
    const { from, to } = dayBoundsUtc("2026-07-06", TZ);
    expect(from).toBe("2026-07-05T22:00:00.000Z");
    expect(to).toBe("2026-07-06T21:59:59.999Z");
  });
});
