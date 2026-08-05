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
export const APPLICATION_VERSION = "0.2.0";
