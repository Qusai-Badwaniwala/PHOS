/**
 * The application version PHOS stamps onto every backup and export
 * (SDS Part 13 "VERSION COMPATIBILITY").
 *
 * Declared as a constant rather than imported from `package.json`,
 * because PHOS now runs entirely in the browser and importing that file
 * would inline the whole manifest — every dependency name and version —
 * into the bundle shipped to users.
 *
 * The obvious risk of a hand-maintained copy is drift. `tests/unit/
 * version.test.ts` asserts this equals `package.json`'s `version`, so a
 * bump in one place without the other fails the build rather than
 * silently making yesterday's backups unrestorable.
 */
export const APPLICATION_VERSION = "0.3.0";

/**
 * The version of the *data format* an export or backup is written in —
 * which is not the same thing as the version of the application that
 * wrote it, and must not be confused with it again.
 *
 * WHY THIS EXISTS
 * ---------------
 * Restore and import compared `applicationVersion` with `!==`, so every
 * release made every previously written file unusable. v0.2.1 backups
 * became unrestorable the moment v0.3.0 shipped — including the safety
 * backup PHOS takes automatically before a full reset, which exists
 * precisely so an accidental wipe is recoverable.
 *
 * That was always wrong, and v0.3.0 is where it would have done real
 * harm: this is the release that reframes the exported file as the only
 * copy that survives a cleared browser, and tells the user so in a
 * warning on the Backup screen. Promising that and then refusing to read
 * last month's file is the sharpest possible version of PHOS claiming
 * something untrue.
 *
 * WHEN TO CHANGE IT
 * -----------------
 * Only when an older file genuinely cannot be read — a field removed, a
 * field's meaning changed, a store restructured. Adding fields does not
 * count: the schema rule for stored data is additive-only (see
 * `docs/HANDOFF.md`), an absent field resolves to the behaviour the user
 * already had, and both readers below tolerate unknown extra keys.
 *
 * Bumping the application version must never bump this by reflex.
 */
export const EXPORT_FORMAT_VERSION = 1;

/**
 * Whether data written with the given format version can be read now.
 *
 * `undefined` means the file predates the field entirely — every file
 * written by v0.1.0 through v0.2.1, all of which are format 1. Treating
 * them as unreadable is exactly the bug this function exists to end, so
 * they are accepted rather than rejected.
 *
 * Newer-than-current is refused, because a file from a future PHOS may
 * rely on something this build does not understand, and silently
 * importing half of somebody's Hifz is worse than declining it.
 */
export function canReadFormat(formatVersion: string | number | undefined): boolean {
  // Backups have always stamped this as a string (`SNAPSHOT_FORMAT_VERSION`,
  // "1"); exports gained it as a number in v0.3.0. Both are read here so
  // there is one rule rather than two that can drift apart.
  const written = formatVersion === undefined ? EXPORT_FORMAT_VERSION : Number(formatVersion);
  return Number.isFinite(written) && written <= EXPORT_FORMAT_VERSION;
}
