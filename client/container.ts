import { AdaptiveEngine, DEFAULT_ADAPTIVE_CONFIG } from "@/engines/adaptive";
import { AnalyticsEngine } from "@/engines/analytics";
import { LearningEngine } from "@/engines/learning";
import { MemoryEngine } from "@/engines/memory";
import { BrowserPersistenceEngine } from "@/engines/persistence/browser";
import {
  BrowserBackupRepository,
  BrowserExamRepository,
  BrowserPageRepository,
  BrowserRecallEventRepository,
  BrowserRoadmapRepository,
  BrowserSessionRepository,
  BrowserSettingsRepository,
} from "@/repositories/browser";
import { APPLICATION_VERSION } from "@/shared/constants";

/**
 * The application container, wired for the browser.
 *
 * Identical in shape and purpose to the `server/container.ts` it
 * replaces: every repository and engine singleton, already assembled.
 * The only difference is which six classes sit behind the repository
 * interfaces — which is exactly the seam SDS Part 9's dependency
 * injection rule was there to provide, and the reason moving PHOS into
 * the browser touched no engine and no engine test.
 *
 * WHY THERE IS NO SERVER SIDE OF THIS ANY MORE
 * --------------------------------------------
 * PHOS is a single-user application whose data belongs to one person on
 * one device. A server added nothing to that and cost a great deal:
 * somewhere to host, someone's machine to trust, and an installation
 * step ("run npm") that put the app out of reach of the people it is
 * for. Running the engines in the browser removes all three. The
 * trade-offs it introduces — data scoped to one browser profile, and
 * lost if the user clears site data — are real, are stated plainly in
 * the app's own guide, and are what export-to-file exists to answer.
 */
const repositories = {
  pageRepository: new BrowserPageRepository(),
  recallEventRepository: new BrowserRecallEventRepository(),
  sessionRepository: new BrowserSessionRepository(),
  settingsRepository: new BrowserSettingsRepository(),
  roadmapRepository: new BrowserRoadmapRepository(),
  backupRepository: new BrowserBackupRepository(),
  examRepository: new BrowserExamRepository(),
};

const memoryEngine = new MemoryEngine({
  pageRepository: repositories.pageRepository,
  recallEventRepository: repositories.recallEventRepository,
});

const adaptiveEngine = new AdaptiveEngine({
  pageRepository: repositories.pageRepository,
  sessionRepository: repositories.sessionRepository,
  memoryEngine,
  // Requirement 2: scheduling follows the user's chosen memorization
  // order rather than the Mushaf's page order.
  settingsRepository: repositories.settingsRepository,
  roadmapRepository: repositories.roadmapRepository,
  // Requirements 3, 7, 8: the daily workload is observed from real
  // recall history rather than fixed at the onboarding estimate.
  recallEventRepository: repositories.recallEventRepository,
  // Phase 11: a booked exam replaces the day's plan with a coverage
  // schedule over its scope.
  examRepository: repositories.examRepository,
  config: DEFAULT_ADAPTIVE_CONFIG,
});

const analyticsEngine = new AnalyticsEngine({
  pageRepository: repositories.pageRepository,
  recallEventRepository: repositories.recallEventRepository,
  sessionRepository: repositories.sessionRepository,
});

const persistenceEngine = new BrowserPersistenceEngine({
  pageRepository: repositories.pageRepository,
  recallEventRepository: repositories.recallEventRepository,
  sessionRepository: repositories.sessionRepository,
  settingsRepository: repositories.settingsRepository,
  backupRepository: repositories.backupRepository,
  applicationVersion: APPLICATION_VERSION,
});

/**
 * `LearningEngine` is deliberately a single shared instance. It holds
 * active-session state in memory (current plan, position, pending
 * recall) by design — see the class's own doc comment.
 *
 * In the browser that in-memory state now lives in the page, so it is
 * lost on reload rather than on server restart. This changes nothing
 * about correctness: the engine already treats the persisted `Session`
 * row as the source of truth for "a session is in progress" and
 * rehydrates from it via `ensureActiveSession()`, precisely because the
 * cache was always assumed to be losable.
 */
const learningEngine = new LearningEngine({
  adaptiveEngine,
  memoryEngine,
  sessionRepository: repositories.sessionRepository,
  recallEventRepository: repositories.recallEventRepository,
  pageRepository: repositories.pageRepository,
});

export const container = {
  ...repositories,
  memoryEngine,
  adaptiveEngine,
  analyticsEngine,
  persistenceEngine,
  learningEngine,
};

export type Container = typeof container;
