/**
 * Today's date as YYYY-MM-DD in the browser's local timezone. Plain
 * `new Date().toISOString().split('T')[0]` returns the UTC calendar date,
 * which is a day behind Korean local time for roughly 9 hours every night
 * (KST is UTC+9) -- records/dates defaulting to that would silently land
 * on "yesterday".
 */
export function todayLocalDate(): string {
  const d = new Date();
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().split('T')[0];
}
