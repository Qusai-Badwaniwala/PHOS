import type { ExportResult, ImportResult } from "@/shared/types";
import type { IPersistenceEngine } from "../interfaces";
import type { PhosExportData } from "../models";

/** An export, plus the data itself — there is no file to read it back from. */
export interface BrowserExportResult extends ExportResult {
  readonly content: PhosExportData;
}

/**
 * The Persistence Engine's contract when PHOS runs entirely in the
 * browser.
 *
 * Three of `IPersistenceEngine`'s members assume a filesystem and a
 * migration CLI that do not exist here, so they are replaced rather
 * than faked:
 *
 * - `exportData()` returns the exported data alongside its metadata.
 *   The SQL version wrote a file and returned only its name, leaving
 *   the caller to read it back; with no filesystem there is nothing to
 *   read back, so the content comes with the result.
 *
 * - `importData()` takes the file's *contents*, not a path. The browser
 *   hands JavaScript a `File` object, never a path, and inventing one
 *   would be a lie about what the argument is.
 *
 * - `runMigration()` is gone entirely. IndexedDB upgrades run inside
 *   `openDB`'s `upgrade` callback the moment the database is opened —
 *   there is no such thing as a pending migration to apply later, so a
 *   method to apply one could only ever be a no-op.
 *
 * Everything else is identical, which is the point: backup, restore,
 * verification and reset behave the same way whichever store is
 * underneath.
 */
export interface IBrowserPersistenceEngine extends Omit<
  IPersistenceEngine,
  "exportData" | "importData" | "runMigration"
> {
  exportData(): Promise<BrowserExportResult>;
  importData(fileContents: string): Promise<ImportResult>;
}
