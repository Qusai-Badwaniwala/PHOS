import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { juzNumberForPage, TOTAL_MUSHAF_PAGES } from "@/shared/constants";

/**
 * PHOS's browser database.
 *
 * WHY THIS EXISTS
 * ---------------
 * PHOS's engines have always depended on repository *interfaces*, with
 * the container supplying the implementations (SDS Part 9, "DEPENDENCY
 * INJECTION"). That decision is what makes running entirely in the
 * browser a change of implementation rather than a rewrite: the five
 * engines, their calculators and their tests are untouched, and only
 * the six classes behind those interfaces differ.
 *
 * The stores below mirror `prisma/schema.prisma` exactly — same
 * entities, same keys, same indexes — so a reader can hold one mental
 * model of PHOS's data whichever backing store is in use.
 *
 * WHAT IS DELIBERATELY DIFFERENT
 * ------------------------------
 * IndexedDB has no foreign keys, so the `onDelete: Restrict` relations
 * the SQL schema uses to make deletion order explicit cannot be
 * enforced by the store. That ordering is instead enforced in code, by
 * `PersistenceEngine.resetAllData()`, which already deletes
 * children-first for exactly this reason. The guarantee survives; only
 * its enforcement point moves.
 */

/** Bumped only when the object stores or indexes change shape. */
export const DATABASE_VERSION = 1;
const DATABASE_NAME = "phos";

/**
 * Format version of the snapshots stored inside backups and written by
 * export (SDS Part 13 "VERSION COMPATIBILITY" — "backup format
 * version"). Bump this if `PhosSnapshot` ever changes shape in a way
 * that older snapshots cannot be read under.
 *
 * It lives here rather than with the Persistence Engine's constants
 * because it describes the *storage* format, which is this layer's
 * business; the engine only quotes it back in the manifest.
 */
export const SNAPSHOT_FORMAT_VERSION = "1";

export interface StoredPage {
  id: string;
  pageNumber: number;
  juzNumber: number;
  memoryState: string;
  memoryStrength: number;
  memoryStability: number;
  difficulty: number;
  firstStudiedAt: string | null;
  lastReviewedAt: string | null;
  lastSuccessfulRecallAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  sessionType: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
}

export interface StoredSessionItem {
  id: string;
  sessionId: string;
  pageId: string;
  order: number;
}

export interface StoredRecallEvent {
  id: string;
  pageId: string;
  sessionId: string;
  timestamp: string;
  successfulRecall: boolean;
  confidence: string;
  durationSeconds: number;
}

export interface StoredSettings {
  id: string;
  theme: string;
  ayahRotationFrequency: number;
  dateFormat: string;
  timeFormat: string;
  reducedMotion: boolean;
  compactMode: boolean;
  sessionShowTimer: boolean;
  sessionShowProgress: boolean;
  sessionConfirmCompletion: boolean;
  revisionShowProgress: boolean;
  onboardingCompletedAt: string | null;
  memorizationLevel: string;
  pagesAlreadyMemorized: number;
  dailyAvailableMinutes: number;
  comfortableDailyPages: number;
  followsExistingSchedule: boolean;
  revisionStartsImmediately: boolean;
  memorizationOrder: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredRoadmapEntry {
  id: string;
  juzNumber: number;
  position: number;
  paused: boolean;
}

/**
 * What the `.manifest.json` sidecar carried in the SQL build, kept
 * intact here because the fields SDS Part 13 "VERSION COMPATIBILITY"
 * requires do not fit in `BackupMetadata`.
 *
 * With no filesystem there is nowhere to put a sidecar, so it is stored
 * on the record itself. Same shape as the engine's `BackupManifest`,
 * declared here rather than imported so that the repository layer does
 * not depend on an engine.
 */
export interface SnapshotManifest {
  applicationVersion: string;
  databaseSchemaVersion: string;
  backupFormatVersion: string;
  createdAt: string;
  checksumSha256: string;
}

export interface StoredBackup {
  id: string;
  filename: string;
  createdAt: string;
  fileSizeBytes: number;
  applicationVersion: string;
  manifest: SnapshotManifest;
  /**
   * The backup's contents.
   *
   * The SQL schema stored metadata only, because the bytes lived in a
   * file on disk. In the browser there is no filesystem to point at, so
   * the snapshot is held here. The rule it was protecting — that the
   * *metadata* table never becomes the source of truth for user data —
   * still holds: this is an inert copy, never read by any engine except
   * during a restore.
   */
  snapshot: PhosSnapshot;
}

/** A complete copy of every store. Used for backup, restore and export. */
export interface PhosSnapshot {
  pages: StoredPage[];
  sessions: StoredSession[];
  sessionItems: StoredSessionItem[];
  recallEvents: StoredRecallEvent[];
  settings: StoredSettings | null;
  roadmapEntries: StoredRoadmapEntry[];
}

interface PhosDB extends DBSchema {
  pages: {
    key: string;
    value: StoredPage;
    indexes: { pageNumber: number; memoryState: string; juzNumber: number };
  };
  sessions: {
    key: string;
    value: StoredSession;
    indexes: { startedAt: string };
  };
  sessionItems: {
    key: string;
    value: StoredSessionItem;
    indexes: { sessionId: string };
  };
  recallEvents: {
    key: string;
    value: StoredRecallEvent;
    indexes: { pageId: string; sessionId: string; timestamp: string };
  };
  settings: { key: string; value: StoredSettings };
  roadmapEntries: {
    key: string;
    value: StoredRoadmapEntry;
    indexes: { juzNumber: number };
  };
  backups: {
    key: string;
    value: StoredBackup;
    indexes: { createdAt: string };
  };
}

let databasePromise: Promise<IDBPDatabase<PhosDB>> | null = null;

/**
 * The open, seeded database.
 *
 * Seeding is part of opening rather than a step a caller has to
 * remember. The SQL build ran `npm run db:seed` as an install step; in
 * the browser there is no install step, only a user opening a link, so
 * "has this database been seeded yet" has to be answered by the code
 * that hands out the connection. Doing it anywhere else would leave a
 * window in which a repository could read an empty Mushaf and report,
 * quite truthfully, that the user has nothing to study.
 *
 * The promise is cached so concurrent callers share one connection and
 * one seed: `openDB` blocks other connections during an upgrade, and
 * five engines starting at once would otherwise race.
 */
export function getDatabase(): Promise<IDBPDatabase<PhosDB>> {
  databasePromise ??= openDatabase().then(async (db) => {
    await seed(db);
    return db;
  });

  return databasePromise;
}

/** Opens the connection and creates its stores on first use. */
function openDatabase(): Promise<IDBPDatabase<PhosDB>> {
  return openDB<PhosDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      const pages = db.createObjectStore("pages", { keyPath: "id" });
      // Mirrors the indexes declared in `schema.prisma`.
      pages.createIndex("pageNumber", "pageNumber", { unique: true });
      pages.createIndex("memoryState", "memoryState");
      pages.createIndex("juzNumber", "juzNumber");

      const sessions = db.createObjectStore("sessions", { keyPath: "id" });
      sessions.createIndex("startedAt", "startedAt");

      const sessionItems = db.createObjectStore("sessionItems", { keyPath: "id" });
      sessionItems.createIndex("sessionId", "sessionId");

      const recallEvents = db.createObjectStore("recallEvents", { keyPath: "id" });
      recallEvents.createIndex("pageId", "pageId");
      recallEvents.createIndex("sessionId", "sessionId");
      recallEvents.createIndex("timestamp", "timestamp");

      db.createObjectStore("settings", { keyPath: "id" });

      const roadmap = db.createObjectStore("roadmapEntries", { keyPath: "id" });
      roadmap.createIndex("juzNumber", "juzNumber", { unique: true });

      const backups = db.createObjectStore("backups", { keyPath: "id" });
      backups.createIndex("createdAt", "createdAt");
    },
  });
}

/** Drops the cached connection. Tests use it to start from a clean database. */
export function resetDatabaseConnection(): void {
  databasePromise = null;
}

/**
 * Identifiers matching the shape Prisma's `cuid()` produced, so ids
 * created before and after this migration look alike and any code that
 * merely passes them around is unaffected.
 *
 * `crypto.randomUUID` is available in every browser that supports the
 * rest of what PHOS needs; the fallback covers older test runners.
 */
export function generateId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2).padEnd(24, "0");
  return `c${Date.now().toString(36)}${random}`.slice(0, 25);
}

/**
 * Creates the 604 Page rows and the singleton Settings row if they are
 * missing (SDS Part 7, "SEEDING").
 *
 * Idempotent in the same way `prisma/seed.ts` was: an existing page is
 * left completely untouched, so real memorization progress can never be
 * overwritten by a reseed. Runs when the database is opened, where the
 * SQL build ran `npm run db:seed` at install time.
 */
export async function seedIfEmpty(): Promise<void> {
  await getDatabase();
}

async function seed(db: IDBPDatabase<PhosDB>): Promise<void> {
  const pageCount = await db.count("pages");
  if (pageCount < TOTAL_MUSHAF_PAGES) {
    const existing = new Set((await db.getAll("pages")).map((page: StoredPage) => page.pageNumber));

    const tx = db.transaction("pages", "readwrite");
    for (let pageNumber = 1; pageNumber <= TOTAL_MUSHAF_PAGES; pageNumber += 1) {
      if (existing.has(pageNumber)) continue;
      const now = new Date().toISOString();
      await tx.store.add({
        id: generateId(),
        pageNumber,
        juzNumber: juzNumberForPage(pageNumber),
        memoryState: "Unseen",
        memoryStrength: 0,
        memoryStability: 0,
        difficulty: 0,
        firstStudiedAt: null,
        lastReviewedAt: null,
        lastSuccessfulRecallAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    await tx.done;
  }

  const settingsCount = await db.count("settings");
  if (settingsCount === 0) {
    const now = new Date().toISOString();
    await db.add("settings", {
      id: generateId(),
      theme: "system",
      ayahRotationFrequency: 1,
      dateFormat: "mdy",
      timeFormat: "12h",
      reducedMotion: false,
      compactMode: false,
      sessionShowTimer: true,
      sessionShowProgress: true,
      sessionConfirmCompletion: false,
      revisionShowProgress: true,
      onboardingCompletedAt: null,
      memorizationLevel: "Beginner",
      pagesAlreadyMemorized: 0,
      dailyAvailableMinutes: 30,
      comfortableDailyPages: 1,
      followsExistingSchedule: false,
      revisionStartsImmediately: true,
      memorizationOrder: "Standard",
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Serializes a snapshot to a byte-for-byte reproducible string.
 *
 * Object keys are sorted, so the result is a function of the snapshot's
 * *content* alone. Plain `JSON.stringify` would instead depend on key
 * insertion order, which IndexedDB's structured clone preserves but
 * nothing guarantees across a restore — and a checksum that changes
 * when nothing meaningful did would report corruption where there is
 * none.
 */
export function serializeSnapshot(snapshot: PhosSnapshot): string {
  return JSON.stringify(snapshot, (_key, value: unknown) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, record[key]]),
    );
  });
}

/** Byte length of a serialized snapshot, which is what a user reads as "size". */
export function byteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).length;
}

/**
 * Content hash of a serialized snapshot, used to prove a backup came
 * back out of IndexedDB as it went in.
 *
 * `crypto.subtle` needs a secure context. PHOS always has one in
 * practice — a service worker requires it too — but a plain-HTTP
 * origin would otherwise leave backups with no integrity check at all,
 * so a non-cryptographic fallback is used there instead. The algorithm
 * is named in the value, so verification can never compare a hash
 * against one computed a different way.
 */
export async function computeChecksum(serialized: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
    const hex = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `sha256:${hex}`;
  }

  // FNV-1a, 32-bit. Detects corruption, not tampering — which is the
  // only threat that applies to a file the user owns on their own
  // device.
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a:${hash.toString(16).padStart(8, "0")}`;
}

/** Reads every store into one object. Used by backup and export. */
export async function readSnapshot(): Promise<PhosSnapshot> {
  const db = await getDatabase();
  const [pages, sessions, sessionItems, recallEvents, settings, roadmapEntries] = await Promise.all(
    [
      db.getAll("pages"),
      db.getAll("sessions"),
      db.getAll("sessionItems"),
      db.getAll("recallEvents"),
      db.getAll("settings"),
      db.getAll("roadmapEntries"),
    ],
  );

  return {
    pages,
    sessions,
    sessionItems,
    recallEvents,
    settings: settings[0] ?? null,
    roadmapEntries,
  };
}

/**
 * Replaces every store from a snapshot.
 *
 * Backups are excluded on purpose: restoring a backup must not also
 * roll back the *list* of backups, or the safety copy taken moments
 * earlier would vanish along with everything else — the exact defect
 * found in the SQL implementation during Phase 3, where restoring
 * overwrote the backup table because it lived inside the database being
 * replaced.
 */
export async function writeSnapshot(snapshot: PhosSnapshot): Promise<void> {
  const db = await getDatabase();
  const stores = [
    "pages",
    "sessions",
    "sessionItems",
    "recallEvents",
    "settings",
    "roadmapEntries",
  ] as const;

  const tx = db.transaction(stores, "readwrite");
  await Promise.all(stores.map((store) => tx.objectStore(store).clear()));

  await Promise.all([
    ...snapshot.pages.map((row) => tx.objectStore("pages").add(row)),
    ...snapshot.sessions.map((row) => tx.objectStore("sessions").add(row)),
    ...snapshot.sessionItems.map((row) => tx.objectStore("sessionItems").add(row)),
    ...snapshot.recallEvents.map((row) => tx.objectStore("recallEvents").add(row)),
    ...snapshot.roadmapEntries.map((row) => tx.objectStore("roadmapEntries").add(row)),
    ...(snapshot.settings ? [tx.objectStore("settings").add(snapshot.settings)] : []),
  ]);

  await tx.done;
}
