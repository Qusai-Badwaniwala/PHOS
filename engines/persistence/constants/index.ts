/**
 * Format version for the manifest sidecar this engine writes next to
 * every physical backup file (SDS Part 13 "VERSION COMPATIBILITY" —
 * "Backup format version"). Bump this if the manifest shape ever
 * changes in a way that is not backward compatible.
 */
export const BACKUP_FORMAT_VERSION = "1";

/**
 * A date range wide enough to represent "all time" for the purposes
 * of `findBetweenDates()` calls. SDS Part 9's Session and RecallEvent
 * repository contracts define `findBetweenDates()` but no `findAll()`;
 * this engine uses that method with this bound whenever it genuinely
 * needs every record (export, storage statistics), rather than
 * inventing a new repository method beyond the approved contract.
 */
export const EPOCH_START = new Date(0);
export const FAR_FUTURE = new Date("2999-12-31T23:59:59.999Z");
