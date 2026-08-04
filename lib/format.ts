/**
 * Presentation-layer date and time formatting, driven by the user's
 * Settings.
 *
 * Deliberately separate from `shared/utils/date.ts`, which defines the
 * *day boundary* used for scheduling. That file answers "which day does
 * this work belong to?" and must never depend on a display preference.
 * This file only answers "how should this instant be written down?".
 */

/** `mdy` → MM/DD/YYYY, `dmy` → DD/MM/YYYY. */
export type DateFormat = "mdy" | "dmy";
/** `12h` → 3:05 PM, `24h` → 15:05. */
export type TimeFormat = "12h" | "24h";

export interface Formats {
  readonly dateFormat: DateFormat;
  readonly timeFormat: TimeFormat;
}

const DEFAULT_FORMATS: Formats = { dateFormat: "mdy", timeFormat: "12h" };

/**
 * The active formats, cached at module scope.
 *
 * Preferences live in the database as of Phase 4, but the `lib/api/*`
 * adapters convert timestamps to display strings at fetch time — that
 * is, outside React, where an async read is not available. Rather than
 * make every adapter fetch settings before it can format a date,
 * `SettingsProvider` publishes the current formats here whenever they
 * load or change, and the adapters read them synchronously.
 *
 * A stale cache is impossible in the direction that matters: the
 * provider updates this before any screen can render a newly-fetched
 * date, so a format change applies to every subsequent fetch.
 */
let activeFormats: Formats = DEFAULT_FORMATS;

/** Called by `SettingsProvider` whenever preferences load or change. */
export function setActiveFormats(formats: Partial<Formats>): void {
  activeFormats = {
    dateFormat: formats.dateFormat === "dmy" ? "dmy" : "mdy",
    timeFormat: formats.timeFormat === "24h" ? "24h" : "12h",
  };
}

export function currentFormats(): Formats {
  return activeFormats;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Formats a date using an explicit pattern rather than
 * `toLocaleDateString()`.
 *
 * The locale-based call was ambiguous in exactly the way this setting
 * exists to resolve: it renders whatever order the browser's locale
 * prefers, so a user who chose DD/MM/YYYY could still be shown
 * MM/DD/YYYY. Building the string here makes the chosen order the one
 * that actually appears.
 */
export function formatDate(value: Date | string, format: DateFormat = "mdy"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return format === "dmy" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
}

export function formatTime(value: Date | string, format: TimeFormat = "12h"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const minutes = pad(date.getMinutes());
  const hours24 = date.getHours();

  if (format === "24h") return `${pad(hours24)}:${minutes}`;

  const suffix = hours24 < 12 ? "AM" : "PM";
  // 0 and 12 both display as 12 on a 12-hour clock.
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${suffix}`;
}

export function formatDateTime(
  value: Date | string,
  dateFormat: DateFormat = "mdy",
  timeFormat: TimeFormat = "12h",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
}

/** Formats a date using the user's current preference. */
export function formatDatePreferred(value: Date | string): string {
  return formatDate(value, activeFormats.dateFormat);
}

/** Formats a time using the user's current preference. */
export function formatTimePreferred(value: Date | string): string {
  return formatTime(value, activeFormats.timeFormat);
}

/** Formats a date and time using the user's current preferences. */
export function formatDateTimePreferred(value: Date | string): string {
  return formatDateTime(value, activeFormats.dateFormat, activeFormats.timeFormat);
}
