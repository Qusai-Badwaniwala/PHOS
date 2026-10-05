import { MemoryEngine } from "@/engines/memory";
import {
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserRoadmapRepository,
  BrowserSettingsRepository,
  getDatabase,
} from "@/repositories/browser";
import type { OnboardingUpdate } from "@/repositories/interfaces/ISettingsRepository";
import { examStage } from "@/shared/constants";
import type { MemorizationOrder } from "@/shared/types";

/** Compose the existing setup algorithms in one browser transaction. */
export async function commitBrowserOnboarding(
  update: OnboardingUpdate,
  pageIds: readonly string[],
  dailyRevisionCapacity: number,
  passedStages: readonly number[],
) {
  const db = await getDatabase();
  const tx = db.transaction(["pages", "settings", "exams"], "readwrite");
  void tx.done.catch(() => undefined);
  try {
    const settings = new BrowserSettingsRepository(tx);
    if ((await settings.getSettings()).onboardingCompletedAt)
      throw new Error("Setup was already completed in another window. Reload PHOS to continue.");
    const memory = new MemoryEngine({
      pageRepository: new BrowserPageRepository(tx),
      recallEventRepository: new BrowserRecallEventRepository(),
    });
    const seededPages = pageIds.length
      ? await memory.seedPriorMemorization(
          pageIds,
          update.revisionStartsImmediately,
          dailyRevisionCapacity,
        )
      : 0;
    const exams = new BrowserExamRepository(tx);
    for (const stage of passedStages) {
      const definition = examStage(stage);
      if (definition)
        await exams.recordPast({ stage, juzNumbers: definition.juzNumbers, examDate: null });
    }
    const updated = await settings.completeOnboarding(update);
    await tx.done;
    return { updated, seededPages };
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

/** Declare outside work with existing seeding rules and all-or-nothing writes. */
export async function seedBrowserPriorMemorization(
  pageIds: readonly string[],
  startRevisionNow: boolean,
  capacity: number,
): Promise<number> {
  const db = await getDatabase();
  const tx = db.transaction(["pages"], "readwrite");
  void tx.done.catch(() => undefined);
  try {
    const memory = new MemoryEngine({
      pageRepository: new BrowserPageRepository(tx),
      recallEventRepository: new BrowserRecallEventRepository(),
    });
    const count = await memory.seedPriorMemorization(pageIds, startRevisionNow, capacity);
    await tx.done;
    return count;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

/** A preference and its custom sequence are one command, never two partial saves. */
export async function commitBrowserRoadmap(update: {
  readonly order?: MemorizationOrder;
  readonly juzSequence?: readonly number[];
  readonly juzNumber?: number;
  readonly paused?: boolean;
}): Promise<void> {
  const tx = (await getDatabase()).transaction(["settings", "roadmapEntries"], "readwrite");
  void tx.done.catch(() => undefined);
  try {
    const settings = new BrowserSettingsRepository(tx);
    const roadmap = new BrowserRoadmapRepository(tx);
    if (update.order !== undefined) await settings.updateMemorizationOrder(update.order);
    if (update.juzSequence !== undefined) await roadmap.replaceCustomOrder(update.juzSequence);
    if (update.juzNumber !== undefined)
      await roadmap.updateEntry(update.juzNumber, { paused: update.paused });
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

/** Keep a one-time repair and its completion marker in the same commit. */
export async function commitBrowserRepair(
  kind: "revisionBlocks" | "estimatedDates",
  pageIdsInOrder: readonly string[] = [],
): Promise<{ ran: boolean; pagesRepaired: number }> {
  const tx = (await getDatabase()).transaction(["pages", "recallEvents", "settings"], "readwrite");
  void tx.done.catch(() => undefined);
  try {
    const settings = new BrowserSettingsRepository(tx);
    const current = await settings.getSettings();
    const alreadyRan =
      kind === "revisionBlocks"
        ? current.revisionBlocksRepairedAt
        : current.estimatedDatesRepairedAt;
    if (alreadyRan) {
      await tx.done;
      return { ran: false, pagesRepaired: 0 };
    }
    const memory = new MemoryEngine({
      pageRepository: new BrowserPageRepository(tx),
      recallEventRepository: new BrowserRecallEventRepository(tx),
    });
    const pagesRepaired =
      kind === "revisionBlocks"
        ? await memory.reblockSeededRevision(pageIdsInOrder)
        : await memory.clearEstimatedFirstStudied();
    if (kind === "revisionBlocks") await settings.markRevisionBlocksRepaired();
    else await settings.markEstimatedDatesRepaired();
    await tx.done;
    return { ran: true, pagesRepaired };
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* Already aborted. */
    }
    await tx.done.catch(() => undefined);
    throw error;
  }
}
