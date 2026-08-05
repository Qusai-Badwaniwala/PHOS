/**
 * The operations `lib/api/*` calls. See `README.md` in this directory
 * for what these are and how they map onto the HTTP routes they
 * replace.
 *
 * Namespaced rather than flattened, because several names would
 * otherwise collide (`createBackup`, `getSettings` and `resetAllData`
 * all exist in `lib/api` too) and a reader should be able to tell at a
 * glance which side of the adapter a call is on.
 */
export * as analyticsOps from "./analytics";
export * as backupOps from "./backup";
export * as examOps from "./exams";
export * as migrationOps from "./migrations";
export * as pagesOps from "./pages";
export * as sessionOps from "./session";
export * as settingsOps from "./settings";
