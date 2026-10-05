/**
 * PHOS's definition of a calendar day.
 *
 * PHOS is a single-user, local-first application: "today" means the
 * user's own day, in their own timezone, not UTC. Every part of the
 * system that asks "did this happen today?" must agree on where the
 * boundary falls, otherwise work done between local midnight and UTC
 * midnight is attributed to the wrong day — which for a user east of
 * UTC is a several-hour window every single morning.
 *
 * Defined once here rather than inline, because more than one subsystem
 * needs it (session de-duplication today; missed-day recovery and
 * consistency tracking later).
 *
 * Note the distinction from *elapsed* time: scheduling decisions such as
 * "is this page due?" are based on elapsed days since the last review
 * (see `PriorityCalculator`), which is deliberately calendar-independent
 * and must not use these helpers.
 */

/** Local midnight at the start of the calendar day containing `date`. */
export function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** True if both dates fall on the same calendar day in local time. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Calendar boundaries, unaffected by 23- or 25-hour local days. */
export function daysBetweenLocalDates(from: Date, to: Date): number {
  const ordinal = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((ordinal(to) - ordinal(from)) / 86_400_000);
}

export function addLocalDays(date: Date, count: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

/** Date inputs name local calendar dates; timestamp DTOs keep their timestamp meaning. */
export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : new Date(NaN);
}

export function localDateInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}
