import type { MemoryState, Page } from "@/shared/types";

/**
 * Partial update to a Page's memory variables. Deliberately excludes
 * `memoryState`, which is only ever changed via `updateMemoryState()`
 * — keeping "what the numbers are" and "what state that implies"
 * as two distinct, explicit operations rather than one that could be
 * called with an inconsistent combination.
 */
export interface MemoryVariableUpdate {
  readonly memoryStrength?: number;
  readonly memoryStability?: number;
  readonly difficulty?: number;
}

/** Input for `updateReviewTimestamps()`. */
export interface ReviewTimestampUpdate {
  readonly lastReviewedAt: Date;
  readonly lastSuccessfulRecallAt?: Date;
  /**
   * Set only on a page's first study, when it leaves `Unseen`. Once
   * written it is never changed — "when did I start this page" cannot
   * happen twice.
   *
   * `undefined` leaves it alone. Explicit `null` clears it, which is
   * what "PHOS does not know when this page was first memorized" has to
   * look like: pages the user reports having memorized before PHOS
   * existed have no honest date, and inventing one made the goal
   * projection read those estimates as evidence of a real pace.
   */
  readonly firstStudiedAt?: Date | null;
}

/**
 * Persistence contract for the Page aggregate (SDS Part 9
 * "PAGEREPOSITORY"). The sole owner of Page persistence — no other
 * repository or engine reads or writes Page rows directly.
 */
export interface IPageRepository {
  findById(id: string): Promise<Page | null>;
  findByPageNumber(pageNumber: number): Promise<Page | null>;
  findAll(): Promise<readonly Page[]>;
  findByJuz(juzNumber: number): Promise<readonly Page[]>;
  findByMemoryState(memoryState: MemoryState): Promise<readonly Page[]>;
  updateMemoryVariables(pageId: string, values: MemoryVariableUpdate): Promise<Page>;
  updateMemoryState(pageId: string, state: MemoryState): Promise<Page>;
  updateReviewTimestamps(pageId: string, timestamps: ReviewTimestampUpdate): Promise<Page>;
  save(page: Page): Promise<Page>;
  exists(pageNumber: number): Promise<boolean>;
  /**
   * Returns every Page to its pristine, never-studied state (`Unseen`,
   * all memory variables zeroed, both review timestamps cleared) and
   * returns how many rows were reset.
   *
   * Pages are *reset*, never deleted: the 604 rows are the fixed
   * structure of the Madani Mushaf, created by `prisma/seed.ts`, not
   * user data. Deleting them would leave PHOS with no Mushaf to
   * schedule against and would additionally be blocked by the
   * `onDelete: Restrict` relations in `schema.prisma`.
   *
   * Used only by `PersistenceEngine.resetAllData()` to service the
   * user's explicit "delete all my data" request.
   */
  resetAllProgress(): Promise<number>;
}
