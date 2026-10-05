/**
 * Shared enumerations (SDS Part 8 "ENUMERATIONS", Part 10, Part 17).
 *
 * These are intentionally plain TypeScript enums decoupled from
 * `@prisma/client`. Engines are forbidden from depending on the Prisma
 * Client (see e.g. Part 10 "DEPENDENCIES — Forbidden dependencies:
 * Prisma Client"), so the domain layer must have its own copies of
 * these value sets. Repositories are responsible for translating
 * between the Prisma-generated enum and these shared enums; the string
 * values are identical by design so that translation is a no-op cast.
 */

/**
 * A Page's position along the memorization lifecycle.
 * Owned exclusively by the Memory Engine (SDS Part 10).
 *
 * Legal forward progression:
 *   Unseen -> Encoding -> Fragile -> Growing -> Stable -> Mastered
 * `Mastered` never represents permanent completion; every page remains
 * eligible for future revision, and regression to an earlier state is
 * possible when future recall history supports it. Illegal transitions
 * (e.g. Mastered -> Encoding, Stable -> Unseen) are enforced by the
 * Memory Engine, not by this type.
 */
export enum MemoryState {
  Unseen = "Unseen",
  Encoding = "Encoding",
  Fragile = "Fragile",
  Growing = "Growing",
  Stable = "Stable",
  Mastered = "Mastered",
}

/**
 * The learner's self-reported confidence for a single recall attempt.
 * Confidence supplements objective recall; it never replaces it
 * (SDS Part 10 "CONFIDENCE CONTRACT").
 */
export enum ConfidenceLevel {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

/**
 * The type of learning session, per traditional Hifz methodology
 * (SDS Part 8 / Part 12).
 */
export enum SessionType {
  /** New memorization. */
  Sabaq = "Sabaq",
  /** Recent/near revision. */
  Sabqi = "Sabqi",
  /** Long-term/cumulative revision. */
  Manzil = "Manzil",
  /** Recovery of a weak page. Recovery is a standard workflow, not an
   * exceptional condition (SDS Part 11 "RECOVERY MODE"). */
  Recovery = "Recovery",
}

/**
 * Workload priority categories used by the Adaptive Engine when
 * ordering today's study plan (SDS Part 11 "WORKLOAD PRIORITY").
 * This ordering is invariant unless explicitly changed by the Product
 * Owner.
 */
export enum WorkloadCategory {
  Recovery = "Recovery",
  OverdueRevision = "OverdueRevision",
  RecentRevision = "RecentRevision",
  LongTermRevision = "LongTermRevision",
  NewMemorization = "NewMemorization",
}

/**
 * Reporting/trend period granularity (SDS Part 14 "TREND ANALYSIS").
 */
export enum ReportingPeriod {
  Daily = "Daily",
  Weekly = "Weekly",
  Monthly = "Monthly",
  Yearly = "Yearly",
  Overall = "Overall",
}

/**
 * Direction of a computed trend (SDS Part 16 "TrendAnalysisDTO").
 */
export enum TrendDirection {
  Improving = "Improving",
  Stable = "Stable",
  Declining = "Declining",
}

/**
 * High-level error categories recognized by the PHOS error handling
 * system (SDS Part 19 "ERROR CATEGORIES"). This enum describes the
 * *shape* of an error for typing purposes; the actual Exception classes
 * that carry these categories belong to Shared Utilities (Module 03)
 * and to each Engine's own errors/ folder, not to this module.
 */
export enum ErrorCategory {
  Validation = "Validation",
  Domain = "Domain",
  Persistence = "Persistence",
  Infrastructure = "Infrastructure",
  Unexpected = "Unexpected",
}
