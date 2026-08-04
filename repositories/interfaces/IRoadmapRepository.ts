import type { RoadmapEntry } from "@/shared/types";

/** Partial update to one Juz's roadmap entry. */
export interface RoadmapEntryUpdate {
  readonly position?: number;
  readonly paused?: boolean;
}

/**
 * Persistence contract for the memorization roadmap
 * (PRODUCT_REQUIREMENTS Requirement 2).
 *
 * Exactly 30 entries exist, one per Juz. Like `ISettingsRepository`,
 * this repository guarantees that invariant itself rather than relying
 * on the schema or on seeding having run.
 */
export interface IRoadmapRepository {
  /** All 30 entries, ascending by Juz number, creating them on first access if needed. */
  findAll(): Promise<readonly RoadmapEntry[]>;
  updateEntry(juzNumber: number, update: RoadmapEntryUpdate): Promise<RoadmapEntry>;
  /**
   * Replaces the Custom sequence in one operation. The supplied array
   * is the Juz numbers in the order the user wants them; each entry's
   * `position` is set to its index.
   */
  replaceCustomOrder(juzNumbersInOrder: readonly number[]): Promise<readonly RoadmapEntry[]>;
  /** Clears every pause and restores the natural 1-30 positions. */
  resetToDefaults(): Promise<readonly RoadmapEntry[]>;
}
