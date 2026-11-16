/**
 * Every time on screen is the searched city's local time, not the viewer's.
 * The API gives a UTC offset in seconds, so we shift the instant and then
 * read it back with UTC getters and a UTC-pinned Intl formatter.
 */

function shifted(unixSeconds: number, offsetSeconds: number): Date {
  return new Date((unixSeconds + offsetSeconds) * 1000);
}

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "17:42" */
export function formatClock(unixSeconds: number, offsetSeconds: number): string {
  return clock.format(shifted(unixSeconds, offsetSeconds));
}

/** "Monday 16 November" */
export function formatLongDate(unixSeconds: number, offsetSeconds: number): string {
  return longDate.format(shifted(unixSeconds, offsetSeconds)).replace(',', '');
}

/** Machine-readable local time for <time dateTime>. */
export function isoLocal(unixSeconds: number, offsetSeconds: number): string {
  return shifted(unixSeconds, offsetSeconds).toISOString().slice(0, 16);
}

/** YYYY-MM-DD at the location. */
export function dateKey(unixSeconds: number, offsetSeconds: number): string {
  return shifted(unixSeconds, offsetSeconds).toISOString().slice(0, 10);
}

/** "Tuesday" for a YYYY-MM-DD key. */
export function weekdayOf(key: string): string {
  return weekday.format(new Date(`${key}T12:00:00Z`));
}

/** "17 Nov" for a YYYY-MM-DD key. */
export function dayMonthOf(key: string): string {
  return dayMonth.format(new Date(`${key}T12:00:00Z`));
}

/** "10h 43m", or "43m" under an hour. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${String(minutes % 60).padStart(2, '0')}m` : `${minutes}m`;
}
