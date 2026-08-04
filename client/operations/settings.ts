import { MemorizationLevel, MemorizationOrder, TOTAL_JUZ } from "@/shared/types";
import { primarySurahForPage, TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import { generateCorrelationId } from "@/shared/utils";
import {
  ValidationError,
  validateBoolean,
  validateEnum,
  validateNumericRange,
  validateString,
} from "@/validators";
import type { PreferencesUpdate } from "@/repositories";
import { toRoadmapDTO, toSettingsDTO } from "@/shared/mappers";
import type { RoadmapDTO, SettingsDTO } from "@/shared/dto";
import { container } from "../container";

/**
 * DELIBERATE, DOCUMENTED EXCEPTION, carried over unchanged from the
 * routes these replace: settings operations touch `settingsRepository`
 * and `roadmapRepository` directly rather than going through an engine.
 *
 * Settings is pure preference storage — no calculation, no state
 * machine, no domain rule beyond "exactly one row exists", which
 * `SettingsRepository` already enforces. None of PHOS's five approved
 * engines owns it, and the SDS's engine roster is closed. Inventing a
 * sixth "Settings Engine" to wrap a single repository with zero
 * business logic would be a larger deviation than this narrow one.
 */

export async function getSettings(): Promise<SettingsDTO> {
  return toSettingsDTO(await container.settingsRepository.getSettings());
}

export async function updateTheme(theme: string): Promise<SettingsDTO> {
  const correlationId = generateCorrelationId();
  const validated = validateString(theme, "theme", { minLength: 1, maxLength: 50 }, correlationId);
  return toSettingsDTO(await container.settingsRepository.updateAppearance(validated));
}

const DATE_FORMATS = ["mdy", "dmy"] as const;
const TIME_FORMATS = ["12h", "24h"] as const;

const BOOLEAN_PREFERENCES = [
  "reducedMotion",
  "compactMode",
  "sessionShowTimer",
  "sessionShowProgress",
  "sessionConfirmCompletion",
  "revisionShowProgress",
] as const;

/**
 * Updates display preferences (Phase 4: these moved out of browser
 * storage so they travel with a backup or export).
 *
 * Accepts a partial patch and applies only the fields present, so the
 * UI can send one changed switch rather than the whole object — which
 * also means two rapid changes cannot clobber each other.
 */
export async function updatePreferences(patch: Record<string, unknown>): Promise<SettingsDTO> {
  const correlationId = generateCorrelationId();
  const update: Record<string, unknown> = {};

  if (patch.dateFormat !== undefined) {
    update.dateFormat = validateEnum(patch.dateFormat, DATE_FORMATS, "dateFormat", correlationId);
  }
  if (patch.timeFormat !== undefined) {
    update.timeFormat = validateEnum(patch.timeFormat, TIME_FORMATS, "timeFormat", correlationId);
  }
  for (const field of BOOLEAN_PREFERENCES) {
    if (patch[field] !== undefined) {
      update[field] = validateBoolean(patch[field], field, correlationId);
    }
  }

  return toSettingsDTO(
    await container.settingsRepository.updatePreferences(update as PreferencesUpdate),
  );
}

/**
 * Restores preferences to their first-run defaults.
 *
 * Deliberately non-destructive: memorization data, sessions and recall
 * history are untouched, and so are the onboarding answers. That
 * separation is what lets the Danger Zone offer "Reset Settings"
 * without a typed confirmation while "Delete All Data" requires one —
 * the two actions differ in kind, not just in degree.
 */
export async function resetSettings(): Promise<SettingsDTO> {
  return toSettingsDTO(await container.settingsRepository.resetToDefaults());
}

// ---------------------------------------------------------------
// Onboarding (PRODUCT_REQUIREMENTS Requirement 1)
// ---------------------------------------------------------------

export interface OnboardingResult extends SettingsDTO {
  /** How many pages were marked as already memorized, along the chosen roadmap. */
  readonly seededPages: number;
}

/**
 * Roughly how many pages a day this user can revise.
 *
 * A page is estimated at about a minute (matching the Adaptive
 * Engine's own `baseDurationSeconds`). Most of a day is left for
 * revision because that is where the bulk of a Hifz routine goes, and
 * because new memorization is separately capped by the daily target.
 */
function estimateDailyRevisionCapacity(dailyAvailableMinutes: number): number {
  return Math.max(1, Math.floor(dailyAvailableMinutes * 0.8));
}

/**
 * Records the first-run wizard's answers.
 *
 * The bounds below are sanity limits, not judgements about what a user
 * can achieve: 604 is the length of the Mushaf, 16 hours is a day's
 * plausible waking study time, and 20 pages/day is far beyond any
 * sustainable Hifz pace. They exist to reject nonsense rather than to
 * constrain ambition — Requirement 1 is explicit that these answers
 * "must never permanently define the user's abilities", and real recall
 * history overrides them regardless.
 *
 * Still validated after the move in-process, because every value here
 * comes straight from a form field.
 */
export async function completeOnboarding(
  answers: Record<string, unknown>,
): Promise<OnboardingResult> {
  const correlationId = generateCorrelationId();

  const memorizationLevel = validateEnum(
    answers.memorizationLevel,
    Object.values(MemorizationLevel),
    "memorizationLevel",
    correlationId,
  );
  const memorizationOrder = validateEnum(
    answers.memorizationOrder,
    Object.values(MemorizationOrder),
    "memorizationOrder",
    correlationId,
  );
  const pagesAlreadyMemorized = validateNumericRange(
    answers.pagesAlreadyMemorized,
    "pagesAlreadyMemorized",
    { min: 0, max: TOTAL_MUSHAF_PAGES, integer: true },
    correlationId,
  );
  const dailyAvailableMinutes = validateNumericRange(
    answers.dailyAvailableMinutes,
    "dailyAvailableMinutes",
    { min: 5, max: 960, integer: true },
    correlationId,
  );
  const comfortableDailyPages = validateNumericRange(
    answers.comfortableDailyPages,
    "comfortableDailyPages",
    { min: 0.1, max: 20 },
    correlationId,
  );
  const followsExistingSchedule = validateBoolean(
    answers.followsExistingSchedule,
    "followsExistingSchedule",
    correlationId,
  );
  const revisionStartsImmediately = validateBoolean(
    answers.revisionStartsImmediately,
    "revisionStartsImmediately",
    correlationId,
  );

  // Order is recorded first, because the memorization sequence used for
  // seeding below is derived from it. Someone who began at Juz 30 has
  // memorized the end of the Mushaf, and seeding page numbers 1..N
  // would attribute their Hifz to pages they have never read.
  const updated = await container.settingsRepository.completeOnboarding({
    memorizationLevel,
    memorizationOrder,
    pagesAlreadyMemorized,
    dailyAvailableMinutes,
    comfortableDailyPages,
    followsExistingSchedule,
    revisionStartsImmediately,
  });

  let seededPages = 0;
  if (pagesAlreadyMemorized > 0) {
    const sequence = await container.adaptiveEngine.getMemorizationSequence();
    const alreadyMemorized = sequence.slice(0, pagesAlreadyMemorized);
    seededPages = await container.memoryEngine.seedPriorMemorization(
      alreadyMemorized.map((page) => page.id),
      revisionStartsImmediately,
      // Derived from the user's own time budget rather than assumed, so
      // the revision cycle they are seeded into is one they can
      // actually keep up with. A page takes roughly a minute.
      estimateDailyRevisionCapacity(dailyAvailableMinutes),
    );
  }

  return { ...toSettingsDTO(updated), seededPages };
}

export interface OnboardingPreview {
  /** Contiguous page runs that will be marked as already memorized. */
  readonly ranges: { start: number; end: number }[];
  readonly juzCovered: number[];
  readonly nextPage: {
    pageNumber: number;
    juzNumber: number;
    surah: string | null;
    surahArabic: string | null;
  } | null;
}

/**
 * Shows what the onboarding answers *will* do, before they are saved.
 *
 * This exists because the outcome genuinely surprises people. A user
 * who picks "Juz 30 first" and reports 75 memorized pages is told their
 * next new page is 53 — which is correct (Juz 30 is only 23 pages, so
 * 75 covers all of it plus pages 1–52) but looks like a bug if nothing
 * explains it.
 *
 * Nothing is written. The sequence comes from the same
 * `getMemorizationSequence()` the real seeding uses, so this preview
 * cannot drift from what actually happens.
 */
export async function previewOnboarding(order: string, pages: number): Promise<OnboardingPreview> {
  const correlationId = generateCorrelationId();
  const validatedOrder = validateEnum(
    order,
    Object.values(MemorizationOrder),
    "order",
    correlationId,
  );
  const validatedPages = validateNumericRange(
    pages,
    "pages",
    { min: 0, max: TOTAL_MUSHAF_PAGES, integer: true },
    correlationId,
  );

  const sequence = await container.adaptiveEngine.getMemorizationSequence(validatedOrder);
  const alreadyMemorized = sequence.slice(0, validatedPages);
  const next = sequence[validatedPages];

  return {
    ranges: toContiguousRanges(alreadyMemorized.map((page) => page.pageNumber)),
    juzCovered: [...new Set(alreadyMemorized.map((page) => page.juzNumber))].sort((a, b) => a - b),
    nextPage: next
      ? {
          pageNumber: next.pageNumber,
          juzNumber: next.juzNumber,
          surah: primarySurahForPage(next.pageNumber)?.name ?? null,
          surahArabic: primarySurahForPage(next.pageNumber)?.arabicName ?? null,
        }
      : null,
  };
}

/**
 * Collapses page numbers into readable runs, so a user sees
 * "1–52, 582–604" rather than seventy-five separate numbers.
 */
function toContiguousRanges(pageNumbers: readonly number[]): { start: number; end: number }[] {
  const sorted = [...pageNumbers].sort((a, b) => a - b);
  const ranges: { start: number; end: number }[] = [];

  for (const pageNumber of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && pageNumber === last.end + 1) {
      last.end = pageNumber;
    } else {
      ranges.push({ start: pageNumber, end: pageNumber });
    }
  }

  return ranges;
}

// ---------------------------------------------------------------
// Roadmap (PRODUCT_REQUIREMENTS Requirement 2)
// ---------------------------------------------------------------

export async function getRoadmap(): Promise<RoadmapDTO> {
  const [settings, entries] = await Promise.all([
    container.settingsRepository.getSettings(),
    container.roadmapRepository.findAll(),
  ]);
  return toRoadmapDTO(settings, entries);
}

export interface RoadmapUpdate {
  readonly order?: string;
  readonly juzSequence?: number[];
  readonly juzNumber?: number;
  readonly paused?: boolean;
}

/**
 * Updates the roadmap: the chosen order, a custom Juz sequence, and/or
 * one Juz's paused state.
 *
 * Nothing here touches memorization progress. Requirement 2 is explicit
 * that "Changing the roadmap later must not erase previous memorization
 * data" — this only ever writes to Settings and RoadmapEntry, never to
 * Page, so that guarantee holds structurally rather than by careful
 * coding.
 */
export async function updateRoadmap(update: RoadmapUpdate): Promise<RoadmapDTO> {
  const correlationId = generateCorrelationId();

  if (update.order !== undefined) {
    const order = validateEnum(
      update.order,
      Object.values(MemorizationOrder),
      "order",
      correlationId,
    );
    await container.settingsRepository.updateMemorizationOrder(order);
  }

  if (update.juzSequence !== undefined) {
    await container.roadmapRepository.replaceCustomOrder(
      validateJuzSequence(update.juzSequence, correlationId),
    );
  }

  if (update.juzNumber !== undefined) {
    const juzNumber = validateNumericRange(
      update.juzNumber,
      "juzNumber",
      { min: 1, max: TOTAL_JUZ, integer: true },
      correlationId,
    );
    const paused = validateBoolean(update.paused, "paused", correlationId);
    await container.roadmapRepository.updateEntry(juzNumber, { paused });
  }

  return getRoadmap();
}

/**
 * A custom sequence must be a permutation of all 30 Juz.
 *
 * Requiring completeness rather than accepting a partial list is
 * deliberate: a sequence missing a Juz would silently make that Juz
 * unreachable for new memorization, which looks identical to data loss
 * from the user's side. Pausing is the supported way to set a Juz
 * aside, and it is reversible and visible.
 */
function validateJuzSequence(value: unknown, correlationId: string): number[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      'Field "juzSequence" must be an array of Juz numbers.',
      correlationId,
    );
  }

  const sequence = value.map((entry, index) =>
    validateNumericRange(
      entry,
      `juzSequence[${index}]`,
      { min: 1, max: TOTAL_JUZ, integer: true },
      correlationId,
    ),
  );

  const unique = new Set(sequence);
  if (sequence.length !== TOTAL_JUZ || unique.size !== TOTAL_JUZ) {
    throw new ValidationError(
      `Field "juzSequence" must list all ${TOTAL_JUZ} Juz exactly once.`,
      correlationId,
    );
  }

  return sequence;
}
