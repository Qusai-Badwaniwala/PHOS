/**
 * The Persistence Engine as it runs in the browser.
 *
 * Kept in its own directory rather than replacing `PersistenceEngine`
 * outright: the two differ only where a filesystem was assumed, and
 * having both side by side makes exactly that difference readable.
 */
export { BrowserPersistenceEngine } from "./BrowserPersistenceEngine";
export type { BrowserPersistenceEngineDependencies } from "./BrowserPersistenceEngine";
export type { BrowserExportResult, IBrowserPersistenceEngine } from "./IBrowserPersistenceEngine";
