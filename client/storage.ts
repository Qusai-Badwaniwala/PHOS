/**
 * Asking the browser not to evict PHOS's data.
 *
 * WHY THIS MATTERS MORE THAN IT SOUNDS
 * ------------------------------------
 * By default a browser treats IndexedDB as "best effort": under storage
 * pressure it may clear a site's data without asking. For a cache that
 * is correct behaviour. For someone's record of two years of Hifz it is
 * not.
 *
 * `navigator.storage.persist()` asks for "persistent" instead, which
 * means the browser will not evict the data automatically — only the
 * user can, by clearing site data. Chrome grants it silently to sites
 * the user has engaged with or installed; Firefox prompts; Safari
 * grants it on installed web apps. It is requested on first run, once,
 * and never nagged about, because a refusal is not an error state: PHOS
 * works identically either way, and the honest mitigation — export to a
 * file — is offered regardless.
 */

export type StoragePersistence =
  /** The browser has promised not to evict PHOS's data on its own. */
  | "persistent"
  /** Storage works, but the browser may reclaim it under pressure. */
  | "best-effort"
  /** The browser does not implement the Storage API, so nothing can be asked. */
  | "unsupported";

export interface StorageReport {
  readonly persistence: StoragePersistence;
  /** Bytes the origin is currently using, as the browser reports it. `null` when unavailable. */
  readonly usageBytes: number | null;
  /** Bytes the origin may use before writes start failing. `null` when unavailable. */
  readonly quotaBytes: number | null;
}

/**
 * Requests persistent storage if it has not already been granted.
 *
 * Safe to call repeatedly: an already-persistent origin is not asked
 * again, so this never produces a second prompt in browsers that show
 * one.
 */
export async function ensurePersistentStorage(): Promise<StoragePersistence> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return "unsupported";
  }

  try {
    if (await navigator.storage.persisted()) return "persistent";
    return (await navigator.storage.persist()) ? "persistent" : "best-effort";
  } catch {
    // A browser that throws here (some private-browsing modes) still
    // stores data; it simply will not make a promise about keeping it.
    return "best-effort";
  }
}

/** What the browser will say about PHOS's storage, without asking for anything. */
export async function readStorageReport(): Promise<StorageReport> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { persistence: "unsupported", usageBytes: null, quotaBytes: null };
  }

  let persistence: StoragePersistence = "best-effort";
  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) {
      persistence = "persistent";
    }
  } catch {
    // Leaves the honest default: storage works, no promise was made.
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      persistence,
      usageBytes: estimate.usage ?? null,
      quotaBytes: estimate.quota ?? null,
    };
  } catch {
    return { persistence, usageBytes: null, quotaBytes: null };
  }
}
