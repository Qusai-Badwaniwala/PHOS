import type { MemoryState } from "./enums";

/**
 * Domain-safe representation of a Page.
 *
 * This is what PageRepository returns to Engines (SDS Part 9: "Repositories
 * return domain-safe data structures. No repository shall expose raw
 * Prisma internals outside the persistence layer."). It mirrors the
 * `Page` Prisma model (SDS Part 8) field-for-field but is a plain
 * TypeScript type with no dependency on `@prisma/client`.
 */
export interface Page {
  readonly id: string;
  /** Stable identity of the page within the 604-page Madani Mushaf. */
  readonly pageNumber: number;
  /** Which of the 30 Juz this page belongs to. */
  readonly juzNumber: number;
  readonly memoryState: MemoryState;
  readonly memoryStrength: number;
  readonly memoryStability: number;
  readonly difficulty: number;
  /** When this page was first studied — the moment it left `Unseen`. */
  readonly firstStudiedAt: Date | null;
  readonly lastReviewedAt: Date | null;
  readonly lastSuccessfulRecallAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
