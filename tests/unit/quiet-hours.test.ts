import { describe, it, expect } from "vitest";
import { isQuiet } from "@/lib/push/quiet-hours";

// Pick a date in winter so DST doesn't shift the comparison.
function at(hourUtc: number) {
  return new Date(Date.UTC(2026, 0, 15, hourUtc, 0, 0));
}

describe("isQuiet", () => {
  it("returns false when quiet hours are not configured", () => {
    expect(isQuiet({ quietStart: null, quietEnd: null, timezone: "America/New_York" }, at(3))).toBe(
      false,
    );
    expect(isQuiet({ quietStart: 23, quietEnd: null, timezone: "America/New_York" }, at(3))).toBe(
      false,
    );
  });

  it("respects a wrapping window (23..8) in UTC", () => {
    const prefs = { quietStart: 23, quietEnd: 8, timezone: "UTC" };
    expect(isQuiet(prefs, at(23))).toBe(true);
    expect(isQuiet(prefs, at(2))).toBe(true);
    expect(isQuiet(prefs, at(7))).toBe(true);
    expect(isQuiet(prefs, at(8))).toBe(false);
    expect(isQuiet(prefs, at(15))).toBe(false);
  });

  it("respects a non-wrapping window (9..17) in UTC", () => {
    const prefs = { quietStart: 9, quietEnd: 17, timezone: "UTC" };
    expect(isQuiet(prefs, at(8))).toBe(false);
    expect(isQuiet(prefs, at(9))).toBe(true);
    expect(isQuiet(prefs, at(16))).toBe(true);
    expect(isQuiet(prefs, at(17))).toBe(false);
  });

  it("treats start === end as disabled", () => {
    expect(isQuiet({ quietStart: 6, quietEnd: 6, timezone: "UTC" }, at(6))).toBe(false);
  });

  it("converts to the user's timezone", () => {
    // 3 UTC == 22:00 ET (EST, no DST in Jan)
    const prefs = { quietStart: 22, quietEnd: 6, timezone: "America/New_York" };
    expect(isQuiet(prefs, at(3))).toBe(true);
    // 14 UTC == 9:00 ET, outside the window
    expect(isQuiet(prefs, at(14))).toBe(false);
  });

  it("falls back to UTC if timezone is invalid", () => {
    expect(isQuiet({ quietStart: 22, quietEnd: 6, timezone: "Not/A_TZ" }, at(23))).toBe(true);
  });
});
