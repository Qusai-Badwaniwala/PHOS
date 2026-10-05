import { container } from "../container";
import { commitBrowserRepair } from "../commit-setup";

/**
 * One-time repairs to data already written to a user's device.
 *
 * PHOS stores everything locally, which means a fix to a rule cannot
 * reach records the old rule produced. There is no server to run a
 * migration on and no way to ask several thousand people to delete
 * their Hifz and start again. Repairs therefore run here, on the
 * device, once, the next time the application opens.
 *
 * THE RULES EVERY REPAIR IN THIS FILE FOLLOWS
 * -------------------------------------------
 * 1. Never touch a record the user's own actions produced. Estimates
 *    may be corrected; evidence may not.
 * 2. Never change what the user would experience as their workload —
 *    only what was demonstrably wrong.
 * 3. Record that it ran, so it cannot run twice.
 * 4. Fail silently. A repair that cannot complete must never stop
 *    somebody opening PHOS.
 */

export interface RepairResult {
  readonly ran: boolean;
  readonly pagesRepaired: number;
}

/**
 * Turns interleaved seeded revision into contiguous blocks.
 *
 * Seeding used to spread prior memorization with `index % cycleDays`,
 * which handed one day pages 582, 585, 588, 591. The quantity was
 * right and the arrangement was not — Hifz is recited continuously, and
 * nobody revises every third page. The rule is fixed, but anybody who
 * onboarded before the fix carries the old dates on their device.
 *
 * The repair keeps the exact set of review dates and only changes which
 * page holds which, so nobody's daily load moves by a single page. See
 * `MemoryEngine.reblockSeededRevision()` for why that property is what
 * makes this safe to run without asking.
 */
export async function repairSeededRevisionBlocks(): Promise<RepairResult> {
  try {
    const settings = await container.settingsRepository.getSettings();
    if (settings.revisionBlocksRepairedAt !== null) {
      return { ran: false, pagesRepaired: 0 };
    }

    /*
     * Memorization order, not page order. Somebody who began at Juz 30
     * has their Hifz at the end of the Mushaf, and blocking by page
     * number would build runs across material they have not memorized.
     */
    const sequence = await container.adaptiveEngine.getMemorizationSequence();
    return await commitBrowserRepair(
      "revisionBlocks",
      sequence.map((page) => page.id),
    );
  } catch {
    /*
     * Deliberately silent, and deliberately *not* marked as done. A
     * repair that failed halfway should be retried on the next launch
     * rather than skipped forever — and either way, nobody should be
     * unable to open PHOS because a tidy-up did not finish.
     */
    return { ran: false, pagesRepaired: 0 };
  }
}

/**
 * Clears the invented first-studied dates seeding used to write.
 *
 * Seeding stamped declared prior memorization with its staggered review
 * date, so pages memorized over years looked like pages memorized in
 * the last few weeks. The goal projection read those estimates as
 * evidence — "at about 16 pages a day, you'd reach 424 pages around
 * 18/08/2026", printed beside "nothing recorded in the last seven
 * days" — and the pacing rule read the most recent of them as "you
 * started a new page yesterday" and withheld new memorization.
 *
 * NOTE ON RULE 2 ABOVE. This repair is the deliberate exception: it
 * *does* change what the user sees. Their projection stops naming a
 * pace and says it needs real sessions first. That rule exists so a
 * repair cannot quietly move somebody's workload. Removing fabricated
 * evidence also removes the false recent-start signal used by pacing.
 * Actual recall history and the seeded revision distribution remain intact.
 */
export async function repairEstimatedFirstStudiedDates(): Promise<RepairResult> {
  try {
    const settings = await container.settingsRepository.getSettings();
    if (settings.estimatedDatesRepairedAt !== null) {
      return { ran: false, pagesRepaired: 0 };
    }

    return await commitBrowserRepair("estimatedDates");
  } catch {
    // The failed transaction leaves pages and marker unchanged; retry next launch.
    return { ran: false, pagesRepaired: 0 };
  }
}

/** Runs every outstanding repair. Called once, from the storage bootstrap. */
export async function runPendingRepairs(): Promise<void> {
  await repairSeededRevisionBlocks();
  // After the reblock, which rewrites review timestamps: this one reads
  // `lastReviewedAt` to restate it unchanged, and should see the
  // settled value rather than the one about to be replaced.
  await repairEstimatedFirstStudiedDates();
}
