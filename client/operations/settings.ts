import {
  MemorizationLevel,
  MemorizationOrder,
  MemoryState,
  RevisionMode,
  TOTAL_JUZ,
} from "@/shared/types";
import {
  EXAM_LADDER,
  examStage,
  MAXIMUM_CYCLE_LENGTH_DAYS,
  MINIMUM_CYCLE_LENGTH_DAYS,
  primarySurahForPage,
  TOTAL_MUSHAF_PAGES,
} from "@/shared/constants";
import { generateCorrelationId } from "@/shared/utils";
import { ValidationError, validateBoolean, validateEnum, validateNumericRange } from "@/validators";
import { PRIOR_MEMORIZATION_DIFFICULTY } from "@/engines/memory";
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
  const validated = validateEnum(theme, ["system", "light", "dark"], "theme", correlationId);
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
/**
 * Records that the user has an exported file, after one has actually
 * reached them.
 *
 * Separate from `exportData()` and called *after* the download, because
 * producing the bytes is not the same as the user having the file. A
 * blocked or cancelled download would otherwise clear the "you have
 * never exported" warning while leaving them with nothing — the one
 * warning on the one screen where being wrong is unrecoverable.
 *
 * Non-fatal by design: the export has already succeeded and the file is
 * in their hands, so failing to note it must never surface as an error.
 */
export async function markDataExported(): Promise<void> {
  try {
    await container.settingsRepository.markDataExported();
  } catch {
    // Ignored for the reason above.
  }
}

export async function resetSettings(): Promise<SettingsDTO> {
  return toSettingsDTO(await container.settingsRepository.resetToDefaults());
}

/** Used when settings cannot be read — the same value `lib/api` falls back to. */
const FALLBACK_STUDY_MINUTES = 60;

/**
 * The user's stated daily study budget, for operations that need it
 * before the adapter layer is involved.
 *
 * `lib/api/settings.ts` has its own `getDailyStudyMinutes()` for the
 * screens. This is the same answer for callers *inside* the operations
 * layer, which must not reach upward into the adapter — the dependency
 * only runs one way.
 */
export async function getDailyStudyMinutesForEngine(): Promise<number> {
  try {
    const settings = await container.settingsRepository.getSettings();
    return settings.dailyAvailableMinutes || FALLBACK_STUDY_MINUTES;
  } catch {
    return FALLBACK_STUDY_MINUTES;
  }
}

// ---------------------------------------------------------------
// The user's own goal (Phase 10)
// ---------------------------------------------------------------

export interface GoalInput {
  /** How many of the 604 pages they want memorized. */
  readonly targetPages: number;
  /** ISO date string. */
  readonly targetDate: string;
}

/**
 * Sets the user's goal, or clears it when passed `null`.
 *
 * Validated because both values come straight from form fields. The
 * date is required to be in the future: a goal is a statement about
 * what someone intends to do, and a date already past cannot be one.
 */
export async function updateGoal(goal: GoalInput | null): Promise<SettingsDTO> {
  if (goal === null) {
    return toSettingsDTO(await container.settingsRepository.updateGoal(null));
  }

  const correlationId = generateCorrelationId();
  const targetPages = validateNumericRange(
    goal.targetPages,
    "targetPages",
    { min: 1, max: TOTAL_MUSHAF_PAGES, integer: true },
    correlationId,
  );

  const targetDate = new Date(goal.targetDate);
  if (Number.isNaN(targetDate.getTime())) {
    throw new ValidationError('Field "targetDate" is not a valid date.', correlationId);
  }
  if (targetDate.getTime() <= Date.now()) {
    throw new ValidationError("A goal's date must be in the future.", correlationId);
  }

  return toSettingsDTO(await container.settingsRepository.updateGoal({ targetPages, targetDate }));
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
 * The per-page cost is asked of the Adaptive Engine rather than
 * assumed, using the difficulty seeding will actually write. This used
 * to read `Math.floor(minutes * 0.8)` — an independent guess that a
 * page costs about a minute. The engine charges
 * `base + difficulty × weight`, which for a seeded page is 105 seconds,
 * so onboarding sized every cycle roughly 75% denser than the scheduler
 * could fit. The overflow rolled forward as *overdue* revision, and
 * because overdue revision outranks new memorization, that shortfall
 * compounded until PHOS stopped assigning new pages at all. See
 * `RESERVED_NEW_MEMORIZATION_PAGES` in the Adaptive Engine for the
 * other half of that fix.
 *
 * Deliberately spends the whole budget on revision: new memorization is
 * separately paced by the daily target and separately protected by the
 * floor in the allocator, so holding time back here would only make the
 * cycle slacker than the user asked for.
 */
export function estimateDailyRevisionCapacity(dailyAvailableMinutes: number): number {
  const secondsPerPage = container.adaptiveEngine.estimateSessionDuration({
    difficulty: PRIOR_MEMORIZATION_DIFFICULTY,
  });
  return Math.max(1, Math.floor((dailyAvailableMinutes * 60) / secondsPerPage));
}

/**
 * The level stored for a user, derived from how many Juz they report.
 *
 * Kept only because the field exists in every stored settings row;
 * nothing reads it to make a scheduling decision. The wizard no longer
 * asks for it — see `completeOnboarding()`.
 */
function levelForJuz(juzCount: number): MemorizationLevel {
  if (juzCount >= TOTAL_JUZ) return MemorizationLevel.Hafiz;
  if (juzCount >= 10) return MemorizationLevel.Advanced;
  if (juzCount >= 1) return MemorizationLevel.Intermediate;
  return MemorizationLevel.Beginner;
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

  const memorizationOrder = validateEnum(
    answers.memorizationOrder,
    Object.values(MemorizationOrder),
    "memorizationOrder",
    correlationId,
  );
  const juzAlreadyMemorized = validateNumericRange(
    answers.juzAlreadyMemorized,
    "juzAlreadyMemorized",
    { min: 0, max: TOTAL_JUZ, integer: true },
    correlationId,
  );
  const extraPagesMemorized = validateNumericRange(
    answers.extraPagesMemorized,
    "extraPagesMemorized",
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

  /*
   * Ladder stages the user says they already passed. Validated as
   * numbers in range and silently de-duplicated; an unknown stage is
   * dropped rather than rejected, because a stale value in this list
   * must never be able to block somebody from finishing setup.
   */
  const passedExamStages = Array.isArray(answers.passedExamStages)
    ? [
        ...new Set(
          (answers.passedExamStages as unknown[])
            .filter((value): value is number => typeof value === "number")
            .filter(
              (value) => Number.isInteger(value) && value >= 1 && value <= EXAM_LADDER.length,
            ),
        ),
      ].sort((a, b) => a - b)
    : [];

  /*
   * The sequence is loaded from the order the user just chose, passed
   * explicitly rather than read back from settings.
   *
   * Someone who began at Juz 30 has memorized the end of the Mushaf,
   * and resolving their answer against page numbers 1..N would
   * attribute their Hifz to pages they have never read. Passing the
   * order removes the ordering dependency that made that correctness
   * rest on which line ran first.
   */
  const hasPriorMemorization = juzAlreadyMemorized > 0 || extraPagesMemorized > 0;
  const sequence = hasPriorMemorization
    ? await container.adaptiveEngine.getMemorizationSequence(memorizationOrder)
    : [];
  const pagesAlreadyMemorized = pagesForJuzMemorized(
    sequence,
    juzAlreadyMemorized,
    extraPagesMemorized,
  );

  /*
   * The stored level is derived from the answer rather than asked for.
   *
   * The wizard used to ask both — four buttons phrased in Juz ("I have
   * memorized a few Juz"), then a page count — which put the same
   * question twice in two different units and made the user do the
   * conversion. Nothing reads this field to make a decision; it is
   * kept because it is already in the schema and in every existing
   * user's settings row.
   */
  const memorizationLevel = levelForJuz(juzAlreadyMemorized);

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
    const alreadyMemorized = sequence.slice(0, pagesAlreadyMemorized);
    seededPages = await container.memoryEngine.seedPriorMemorization(
      alreadyMemorized.map((page) => page.id),
      revisionStartsImmediately,
      // Derived from the user's own time budget rather than assumed, so
      // the revision cycle they are seeded into is one they can
      // actually keep up with.
      estimateDailyRevisionCapacity(dailyAvailableMinutes),
    );
  }

  /*
   * Exams the user says they already passed, stored as plain history.
   *
   * Deliberately after seeding and deliberately non-fatal: a failure
   * here must not lose the onboarding answers that were already
   * written. Losing an exam record is a small annoyance the user can
   * repair from the Exams screen; losing their whole setup is not.
   */
  for (const stage of passedExamStages) {
    const definition = examStage(stage);
    if (!definition) continue;
    try {
      await container.examRepository.recordPast({
        stage: definition.stage,
        juzNumbers: definition.juzNumbers,
        // Onboarding does not ask when. Nobody remembers the day they
        // sat Juz 30, and the Exams screen offers a date for anyone who
        // does.
        examDate: null,
      });
    } catch {
      // Ignored for the reason above.
    }
  }

  return { ...toSettingsDTO(updated), seededPages };
}

export interface OnboardingPreview {
  /** The page count the Juz answer resolves to — what actually gets seeded. */
  readonly pagesAlreadyMemorized: number;
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
 * Converts "I have memorized N Juz, plus a few more pages" into the
 * page count PHOS actually stores.
 *
 * People describe their Hifz in Juz; PHOS schedules in pages. Asking
 * for pages directly made the user perform this conversion themselves,
 * which is real arithmetic rather than a mental shortcut — Juz are not
 * a uniform length (Juz 30 is 23 pages, Juz 1 is 21), so there is no
 * "about twenty each" that survives contact with a real answer.
 *
 * It has to be done against the *sequence*, not against Juz numbers,
 * because "3 Juz" means the first three Juz of the user's own order —
 * Juz 30, 29, 28 for somebody starting at the end of the Mushaf.
 *
 * Exported so the preview and the write path cannot disagree: the
 * screen that promises "73 pages" and the code that seeds 73 pages call
 * this same function on the same sequence.
 */
export function pagesForJuzMemorized(
  sequence: readonly { juzNumber: number }[],
  juzCount: number,
  extraPages: number,
): number {
  // Each Juz is one contiguous block in the sequence, so the boundary
  // after `juzCount` Juz is simply the first index whose Juz is not
  // among the first `juzCount` distinct ones.
  const juzOrder: number[] = [];
  for (const page of sequence) {
    if (juzOrder[juzOrder.length - 1] !== page.juzNumber) juzOrder.push(page.juzNumber);
  }
  const wanted = new Set(juzOrder.slice(0, juzCount));
  const wholeJuzPages = sequence.filter((page) => wanted.has(page.juzNumber)).length;

  return Math.min(sequence.length, wholeJuzPages + Math.max(0, extraPages));
}

/**
 * Shows what the onboarding answers *will* do, before they are saved.
 *
 * This exists because the outcome genuinely surprises people. A user
 * who picks "Juz 30 first" and says three Juz is told their next new
 * page is 53 — which is correct (Juz 30, 29 and 28 are 52 pages between
 * them) but looks like a bug if nothing explains it.
 *
 * Nothing is written. The sequence comes from the same
 * `getMemorizationSequence()` the real seeding uses, so this preview
 * cannot drift from what actually happens.
 */
export async function previewOnboarding(
  order: string,
  juzCount: number,
  extraPages: number,
): Promise<OnboardingPreview> {
  const correlationId = generateCorrelationId();
  const validatedOrder = validateEnum(
    order,
    Object.values(MemorizationOrder),
    "order",
    correlationId,
  );
  const validatedJuz = validateNumericRange(
    juzCount,
    "juzCount",
    { min: 0, max: TOTAL_JUZ, integer: true },
    correlationId,
  );
  const validatedExtra = validateNumericRange(
    extraPages,
    "extraPages",
    { min: 0, max: TOTAL_MUSHAF_PAGES, integer: true },
    correlationId,
  );

  const sequence = await container.adaptiveEngine.getMemorizationSequence(validatedOrder);
  const pages = pagesForJuzMemorized(sequence, validatedJuz, validatedExtra);
  const alreadyMemorized = sequence.slice(0, pages);
  const next = sequence[pages];

  return {
    pagesAlreadyMemorized: pages,
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

/** One Juz along the user's own memorization order, as a goal target. */
export interface GoalMilestone {
  /** The Juz itself, e.g. 30 for the first milestone of a Juz-30-first order. */
  juzNumber: number;
  /** Its place along the user's order, 1-based. */
  position: number;
  /** Pages memorized once this Juz is finished — what the goal actually stores. */
  cumulativePages: number;
  /** True when the user has already memorized at least this many pages. */
  reached: boolean;
}

export interface GoalPosition {
  /** Every Juz in the user's order, earliest first. */
  milestones: readonly GoalMilestone[];
  /** Pages that have left `Unseen`. */
  pagesMemorized: number;
  /** The Juz holding the next page they have not started, or `null` when none is left. */
  currentJuz: number | null;
}

/**
 * Where the user is, and the Juz they could aim for.
 *
 * A goal is stored as a page count, because that is what the projection
 * can do arithmetic with. But nobody thinks about Hifz in pages — they
 * think in Juz, and "through Juz 5" only means something along their
 * *own* order. Somebody memorizing Juz 30 first reaches 124 pages at
 * their sixth milestone; the same words mean 101 pages for somebody
 * going in Mushaf order. This resolves that, so the picker can offer
 * Juz and still save a page count.
 *
 * Nothing is written, and the sequence is the same
 * `getMemorizationSequence()` seeding and the onboarding preview use —
 * a third copy of the ordering rule is exactly the duplication that
 * drifts.
 */
export async function getGoalPosition(): Promise<GoalPosition> {
  const [sequence, allPages] = await Promise.all([
    container.adaptiveEngine.getMemorizationSequence(),
    container.pageRepository.findAll(),
  ]);

  // Pausing changes new-study eligibility, never the amount already held.
  const pagesMemorized = allPages.filter((page) => page.memoryState !== MemoryState.Unseen).length;
  const nextUnstudied = sequence.find((page) => page.memoryState === MemoryState.Unseen);

  const milestones: GoalMilestone[] = [];
  for (const [index, page] of sequence.entries()) {
    const last = milestones[milestones.length - 1];
    // The sequence is already grouped by Juz, so a change of Juz opens
    // the next milestone and every page simply extends the current one.
    if (last?.juzNumber === page.juzNumber) {
      last.cumulativePages = index + 1;
      last.reached = pagesMemorized >= last.cumulativePages;
    } else {
      milestones.push({
        juzNumber: page.juzNumber,
        position: milestones.length + 1,
        cumulativePages: index + 1,
        reached: pagesMemorized >= index + 1,
      });
    }
  }

  return {
    milestones,
    pagesMemorized,
    currentJuz: nextUnstudied?.juzNumber ?? null,
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
  // Validate the entire command before any preference or sequence is changed.
  if (update.order !== undefined)
    validateEnum(update.order, Object.values(MemorizationOrder), "order", correlationId);
  if (update.juzSequence !== undefined) validateJuzSequence(update.juzSequence, correlationId);
  if (update.juzNumber !== undefined) {
    validateNumericRange(
      update.juzNumber,
      "juzNumber",
      { min: 1, max: TOTAL_JUZ, integer: true },
      correlationId,
    );
    validateBoolean(update.paused, "paused", correlationId);
  }

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

// ---------------------------------------------------------------
// The traditional revision cycle (Phase 12)
// ---------------------------------------------------------------

export interface RevisionModeInput {
  readonly mode: string;
  readonly cycleLengthDays?: number;
}

/**
 * Switches between PHOS's own scheduling and a fixed traditional cycle.
 *
 * The cycle length is validated to a range that can actually be
 * followed: a one-day cycle means reciting everything memorized every
 * day, and past three months a "cycle" no longer describes anything a
 * person experiences as a rotation. Neither bound is a judgement — the
 * usual choices sit between 7 and 30.
 */
export async function updateRevisionMode(input: RevisionModeInput): Promise<SettingsDTO> {
  const correlationId = generateCorrelationId();

  const mode = validateEnum(
    input.mode,
    Object.values(RevisionMode),
    "mode",
    correlationId,
  ) as RevisionMode;

  const cycleLengthDays =
    input.cycleLengthDays === undefined
      ? undefined
      : validateNumericRange(
          input.cycleLengthDays,
          "cycleLengthDays",
          { min: MINIMUM_CYCLE_LENGTH_DAYS, max: MAXIMUM_CYCLE_LENGTH_DAYS, integer: true },
          correlationId,
        );

  return toSettingsDTO(
    await container.settingsRepository.updateRevisionMode({
      revisionMode: mode,
      ...(cycleLengthDays !== undefined ? { cycleLengthDays } : {}),
    }),
  );
}

/**
 * Starts the rotation again from the beginning of the user's order.
 *
 * Offered because a cycle's position is a stored date, and a person who
 * falls a long way behind their teacher's rotation needs a way to say
 * "start again from the top" without changing anything else.
 */
export async function restartRevisionCycle(): Promise<SettingsDTO> {
  return toSettingsDTO(await container.settingsRepository.restartCycle());
}

/** Where the fixed rotation has reached, or `null` on PHOS's own scheduling. */
export async function getRevisionCycle() {
  const minutes = await getDailyStudyMinutesForEngine();
  return container.adaptiveEngine.getRevisionCycle(minutes);
}
