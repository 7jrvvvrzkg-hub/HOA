// The building is in Norfolk, so every time shown to people is Eastern time —
// not whatever time zone the hosting server happens to be set to (which is
// UTC on Vercel).
export const SITE_TIME_ZONE = "America/New_York";

export function fmtDateTime(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: SITE_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtShort(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: SITE_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2026-10-15" + "14:30" typed in Eastern time -> the real moment in time.
 * Handles daylight saving by asking the time zone what its offset was then. */
export function easternToDate(dateStr: string, timeStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m || !t) return null;
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], t[1], t[2]].map(Number);
  // Start from the same clock reading in UTC, then correct by the zone's offset.
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: SITE_TIME_ZONE,
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(ms));
    const g = (type: string) => Number(parts.find((p) => p.type === type)!.value);
    const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    return asUtc - ms;
  };
  let result = guess - offsetAt(guess);
  result = guess - offsetAt(result); // settle across a daylight-saving edge
  const out = new Date(result);
  return Number.isNaN(out.getTime()) ? null : out;
}
