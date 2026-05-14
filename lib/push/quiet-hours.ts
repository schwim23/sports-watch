type Prefs = {
  quietStart: number | null;
  quietEnd: number | null;
  timezone: string | null;
};

/**
 * Returns true if `now` (a UTC Date) falls inside the user's local quiet window.
 *
 * quietStart and quietEnd are local hours (0-23). When quietStart >= quietEnd
 * the window wraps midnight, e.g. 23..8 means 11pm-8am local. Hours equal means
 * "disabled" (no quiet window).
 */
export function isQuiet(prefs: Prefs, now: Date): boolean {
  if (prefs.quietStart === null || prefs.quietEnd === null) return false;
  if (prefs.quietStart === prefs.quietEnd) return false;
  const tz = prefs.timezone ?? "UTC";
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(
        now,
      ),
    );
  } catch {
    hour = now.getUTCHours();
  }
  const { quietStart: s, quietEnd: e } = prefs;
  return s < e ? hour >= s && hour < e : hour >= s || hour < e;
}
