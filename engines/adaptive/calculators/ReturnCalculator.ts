import { ReturnStatus } from "@/shared/types";
import type { ReturnAssessment } from "@/shared/types";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Day thresholds separating the return tiers
 * (PRODUCT_REQUIREMENTS Requirement 5's own examples: "One missed day
 * — continue almost normally"; "Several missed days — slight increase
 * in revision with reduced memorization"; "Several weeks — recovery
 * mode focusing primarily on rebuilding retention").
 *
 * The exact numbers are a documented interpretation, not values the
 * requirement specifies.
 */
const SHORT_BREAK_DAYS = 2;
const EXTENDED_BREAK_DAYS = 7;
const LONG_BREAK_DAYS = 28;

/**
 * How much new memorization each tier permits, as a fraction of normal.
 *
 * These decrease rather than reaching zero except after a month away,
 * because Requirement 5 asks PHOS to "gradually rebuild momentum" — a
 * user returning after five days who is told they may learn nothing new
 * has been punished for the absence, which the requirement forbids.
 * Retention still leads: revision is never reduced by any of these.
 */
const ALLOWANCE_BY_STATUS: Readonly<Record<ReturnStatus, number>> = {
  [ReturnStatus.Current]: 1,
  [ReturnStatus.ShortBreak]: 0.6,
  [ReturnStatus.ExtendedBreak]: 0.3,
  [ReturnStatus.LongBreak]: 0,
  [ReturnStatus.NeverStudied]: 1,
};

/**
 * Assesses how long the user has been away and how today's plan should
 * respond (PRODUCT_REQUIREMENTS Requirement 5).
 *
 * `lastSessionAt` is the completion time of the most recent finished
 * session, or `null` if there has never been one — a first-time user is
 * not "returning from a break" and must never be greeted as though they
 * had lapsed.
 */
export function assessReturn(lastSessionAt: Date | null, referenceDate: Date): ReturnAssessment {
  if (!lastSessionAt) {
    return {
      status: ReturnStatus.NeverStudied,
      daysSinceLastSession: null,
      newMemorizationAllowance: ALLOWANCE_BY_STATUS[ReturnStatus.NeverStudied],
      welcomeBackMessage: null,
    };
  }

  const daysSinceLastSession = Math.max(
    0,
    Math.floor((referenceDate.getTime() - lastSessionAt.getTime()) / MILLISECONDS_PER_DAY),
  );

  const status = classify(daysSinceLastSession);

  return {
    status,
    daysSinceLastSession,
    newMemorizationAllowance: ALLOWANCE_BY_STATUS[status],
    welcomeBackMessage: buildWelcomeBackMessage(status, daysSinceLastSession),
  };
}

function classify(days: number): ReturnStatus {
  if (days >= LONG_BREAK_DAYS) return ReturnStatus.LongBreak;
  if (days >= EXTENDED_BREAK_DAYS) return ReturnStatus.ExtendedBreak;
  if (days >= SHORT_BREAK_DAYS) return ReturnStatus.ShortBreak;
  return ReturnStatus.Current;
}

/**
 * The returning-user message.
 *
 * Written to Requirement 5's "USER EXPERIENCE" section, which supplies
 * both the tone and a worked example ("Welcome back. We've adjusted
 * your study plan to help you rebuild momentum comfortably."). Every
 * variant states what changed and why, and none of them names a number
 * of missed days as a shortfall or implies fault — "The application
 * must never display messages implying failure or guilt."
 */
function buildWelcomeBackMessage(status: ReturnStatus, days: number): string | null {
  switch (status) {
    case ReturnStatus.ShortBreak:
      return (
        `Welcome back. It has been ${formatDays(days)}, so today leans a little more on revision ` +
        `to settle what you already know before adding to it.`
      );
    case ReturnStatus.ExtendedBreak:
      return (
        `Welcome back. After ${formatDays(days)} away, today focuses on revision and takes on ` +
        `less new memorization — the quickest way back is to make what you have solid again.`
      );
    case ReturnStatus.LongBreak:
      return (
        `Welcome back. It has been ${formatDays(days)}, so PHOS is starting with revision only. ` +
        `Everything you memorized is still here, and new pages return as soon as your recall ` +
        `steadies. Let's continue from where you left off.`
      );
    case ReturnStatus.Current:
    case ReturnStatus.NeverStudied:
    default:
      return null;
  }
}

function formatDays(days: number): string {
  if (days >= 60) return `${Math.floor(days / 30)} months`;
  if (days >= 30) return "a month";
  if (days >= 14) return `${Math.floor(days / 7)} weeks`;
  if (days >= 7) return "a week";
  return `${days} days`;
}
