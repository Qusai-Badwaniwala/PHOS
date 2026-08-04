/**
 * Browser repository layer — IndexedDB implementations of the same
 * interfaces the Prisma repositories implement.
 *
 * Nothing outside this directory imports IndexedDB or `idb`. Engines
 * depend on `repositories/interfaces` exactly as before, which is what
 * made moving PHOS into the browser a change of implementation rather
 * than a rewrite.
 */

export * from "./database";
export * from "./BrowserPageRepository";
export * from "./BrowserSessionRepository";
export * from "./BrowserRecallEventRepository";
export * from "./BrowserSettingsRepository";
export * from "./BrowserRoadmapRepository";
export * from "./BrowserBackupRepository";
