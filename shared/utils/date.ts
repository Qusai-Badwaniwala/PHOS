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
