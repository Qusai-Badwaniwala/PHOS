import type { RecallEvent, RetentionQuality } from "@/shared/types";

/**
 * Computes Retention Quality from historical recall events (SDS
 * Part 14 "RETENTION QUALITY CONTRACT"): the overall successful-recall
 * ratio across the supplied history, as a 0-100 score. Returns 0 when
 * there is no history yet, rather than a misleadingly perfect score.
 */
export function calculateRetentionQuality(
  recallEvents: readonly RecallEvent[],
  calculatedAt: Date,
): RetentionQuality {
  if (recallEvents.length === 0) {
    return { score: 0, calculatedAt, assessedRecallEvents: 0 };
  }

  const successfulCount = recallEvents.filter((event) => event.successfulRecall).length;
  return {
    score: Math.round((successfulCount / recallEvents.length) * 100),
    calculatedAt,
    assessedRecallEvents: recallEvents.length,
  };
}
