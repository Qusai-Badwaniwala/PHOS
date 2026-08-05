import { ExamStatus, TOTAL_JUZ } from "@/shared/types";
import {
  EXAM_LADDER,
  examStage,
  MAXIMUM_EXAM_RUNUP_DAYS,
  MINIMUM_EXAM_RUNUP_DAYS,
} from "@/shared/constants";
import { generateCorrelationId, startOfLocalDay } from "@/shared/utils";
import { ValidationError, validateBoolean, validateNumericRange } from "@/validators";
import {
  toExamAftermathDTO,
  toExamCoverageDayDTO,
  toExamDTO,
  toExamPlanDTO,
  toExamStageDTO,
} from "@/shared/mappers";
import type { ExamOverviewDTO } from "@/shared/dto";
import { container } from "../container";
import { getDailyStudyMinutesForEngine } from "./settings";

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Everything the Dashboard's exam section renders from.
 *
 * Assembled in one call rather than four, because the parts are only
 * meaningful together: a coverage schedule without the exam it belongs
 * to means nothing, and four separate reads could observe the database
 * mid-change and disagree with each other.
 */
export async function getExamOverview(): Promise<ExamOverviewDTO> {
  const now = new Date();
  const [stages, allExams, active] = await Promise.all([
    container.adaptiveEngine.getExamStages(),
    container.examRepository.findAll(),
    container.adaptiveEngine.getActiveExam(now),
  ]);

  const availableStudyMinutes = await getDailyStudyMinutesForEngine();

  const [plan, coverage] = active
    ? await Promise.all([
        container.adaptiveEngine.getExamPlan(active, availableStudyMinutes),
        container.adaptiveEngine.getExamCoverage(active),
      ])
    : [null, []];

  const past = allExams
    .filter((exam) => exam.status === ExamStatus.Passed)
    .sort((a, b) => (b.examDate?.getTime() ?? -Infinity) - (a.examDate?.getTime() ?? -Infinity));

  /*
   * The aftermath belongs to the most recently passed exam, and only
   * while it is still recent enough to act on. Reporting what fell
   * behind during an exam sat four months ago would be describing a
   * backlog the user has long since worked through — and PHOS would be
   * counting pages that are overdue today for entirely unrelated
   * reasons.
   */
  const recentlyPassed = past.find(
    (exam) =>
      // An exam PHOS never ran set nothing aside, so there is nothing
      // for it to have cost. Reporting "31 pages fell behind while you
      // prepared" for a madrasa exam the user merely told PHOS about
      // would be inventing a consequence out of an unrelated backlog.
      !exam.recordedAsPast &&
      exam.passedAt !== null &&
      now.getTime() - exam.passedAt.getTime() <= AFTERMATH_REPORTING_DAYS * MILLISECONDS_PER_DAY,
  );
  const aftermath = recentlyPassed
    ? await container.adaptiveEngine.getExamAftermath(recentlyPassed)
    : null;

  return {
    stages: stages.map(toExamStageDTO),
    active: active ? toExamDTO(active) : null,
    activePlan: plan ? toExamPlanDTO(plan) : null,
    activeCoverage: coverage.map(toExamCoverageDayDTO),
    past: past.map(toExamDTO),
    aftermath: aftermath && aftermath.pagesFallenBehind > 0 ? toExamAftermathDTO(aftermath) : null,
  };
}

/**
 * How long after an exam PHOS keeps reporting what fell behind.
 *
 * Long enough that somebody who does not open the app for a few days
 * still sees it, short enough that it never becomes a permanent notice
 * about an exam they have moved on from.
 */
const AFTERMATH_REPORTING_DAYS = 14;

export interface ScheduleExamInput {
  /** 1–8 for a ladder stage, or `null` with `juzNumbers` for a Self Exam. */
  readonly stage?: number | null;
  readonly juzNumbers?: readonly number[];
  readonly examDate: string;
  readonly includeNewMemorization: boolean;
}

/**
 * Books an exam.
 *
 * WHY A STAGE CAN BE REFUSED
 * --------------------------
 * A ladder stage whose pages are not all memorized is rejected rather
 * than accepted with a caveat. The run-up schedule revises the pages in
 * scope; pages that have never been memorized cannot be revised, so the
 * schedule would silently cover less than the syllabus — the single
 * failure an exam schedule exists to prevent. A Self Exam is held to
 * the same rule for the same reason.
 */
export async function scheduleExam(input: ScheduleExamInput): Promise<ExamOverviewDTO> {
  const correlationId = generateCorrelationId();
  const now = new Date();

  const includeNewMemorization = validateBoolean(
    input.includeNewMemorization,
    "includeNewMemorization",
    correlationId,
  );

  const examDate = new Date(input.examDate);
  if (Number.isNaN(examDate.getTime())) {
    throw new ValidationError('Field "examDate" is not a valid date.', correlationId);
  }

  const daysAway = Math.round(
    (startOfLocalDay(examDate).getTime() - startOfLocalDay(now).getTime()) / MILLISECONDS_PER_DAY,
  );
  if (daysAway < MINIMUM_EXAM_RUNUP_DAYS) {
    throw new ValidationError(
      "An exam needs at least a day to prepare for. Choose a date from tomorrow onward.",
      correlationId,
    );
  }
  if (daysAway > MAXIMUM_EXAM_RUNUP_DAYS) {
    throw new ValidationError(
      "That date is too far away for a run-up schedule to mean anything. Choose one within two years.",
      correlationId,
    );
  }

  // One exam at a time. Two coverage schedules would compete for the
  // same days and neither would be honoured.
  const existing = await container.adaptiveEngine.getActiveExam(now);
  if (existing) {
    throw new ValidationError(
      "You already have an exam scheduled. Mark it passed or cancel it before booking another.",
      correlationId,
    );
  }

  const { stage, juzNumbers } = resolveScope(input, correlationId);

  const pages = await container.pageRepository.findAll();
  const scope = pages.filter((page) => juzNumbers.includes(page.juzNumber));
  const unmemorized = scope.filter((page) => page.memoryState === "Unseen").length;

  if (scope.length === 0) {
    throw new ValidationError("That exam covers no pages.", correlationId);
  }
  if (unmemorized > 0) {
    throw new ValidationError(
      `${unmemorized} of the ${scope.length} pages in this exam have not been memorized yet. PHOS can only schedule revision for pages you have already started.`,
      correlationId,
    );
  }

  await container.examRepository.create({
    stage,
    juzNumbers,
    examDate,
    includeNewMemorization,
  });

  return getExamOverview();
}

/**
 * Resolves which Juz an exam covers.
 *
 * A ladder stage's scope comes from `EXAM_LADDER`, never from the
 * caller — accepting a stage number *and* a Juz list would let the two
 * disagree, and the roadmap would then show a stage whose contents were
 * not the stage's contents.
 */
function resolveScope(
  // Narrowed to the two fields it actually reads, so both a booking and
  // a retrospective record can share it without either pretending to
  // carry the other's fields.
  input: { stage?: number | null; juzNumbers?: readonly number[] },
  correlationId: string,
): { stage: number | null; juzNumbers: readonly number[] } {
  if (input.stage !== undefined && input.stage !== null) {
    const stage = validateNumericRange(
      input.stage,
      "stage",
      { min: 1, max: EXAM_LADDER.length, integer: true },
      correlationId,
    );
    const definition = examStage(stage);
    if (!definition) {
      throw new ValidationError(`There is no exam stage ${stage}.`, correlationId);
    }
    return { stage: definition.stage, juzNumbers: definition.juzNumbers };
  }

  const requested = input.juzNumbers ?? [];
  if (requested.length === 0) {
    throw new ValidationError("Choose at least one Juz for this exam.", correlationId);
  }
  for (const juz of requested) {
    validateNumericRange(
      juz,
      "juzNumbers",
      { min: 1, max: TOTAL_JUZ, integer: true },
      correlationId,
    );
  }

  return { stage: null, juzNumbers: [...new Set(requested)].sort((a, b) => a - b) };
}

/**
 * Records that the user passed an exam.
 *
 * Self-reported on purpose. PHOS has no way to observe an exam and no
 * business grading one — the result belongs to the user and their
 * teacher. Marking it passed is also what ends exam mode and releases
 * the revision that was set aside.
 */
export async function markExamPassed(examId: string): Promise<ExamOverviewDTO> {
  const correlationId = generateCorrelationId();
  const exam = await container.examRepository.findById(examId);
  if (!exam) {
    throw new ValidationError(`No exam found with id "${examId}".`, correlationId);
  }
  await container.examRepository.updateStatus(examId, ExamStatus.Passed, new Date());
  return getExamOverview();
}

/**
 * Calls an exam off.
 *
 * Cancelled rather than deleted: the roadmap should be able to say a
 * stage was booked and did not happen, and quietly erasing the record
 * would leave the user wondering whether they had booked it at all.
 */
export async function cancelExam(examId: string): Promise<ExamOverviewDTO> {
  const correlationId = generateCorrelationId();
  const exam = await container.examRepository.findById(examId);
  if (!exam) {
    throw new ValidationError(`No exam found with id "${examId}".`, correlationId);
  }
  await container.examRepository.updateStatus(examId, ExamStatus.Cancelled, null);
  return getExamOverview();
}

export interface PastExamInput {
  /** 1–8 for a ladder stage, or `null` with `juzNumbers`. */
  readonly stage?: number | null;
  readonly juzNumbers?: readonly number[];
  /** ISO date string, or `null`/omitted when the user does not remember. */
  readonly examDate?: string | null;
}

/**
 * Records an exam the user passed before PHOS was involved.
 *
 * WHAT THIS DELIBERATELY DOES NOT CHECK
 * -------------------------------------
 * Two rules that `scheduleExam()` enforces are dropped here, because
 * both exist to protect a *run-up* and there is no run-up to protect.
 *
 * The memorization check is dropped: it asks "can PHOS revise these
 * pages before the date", which is meaningless for something already
 * sat. Someone who passed Juz 26–30 two years ago and has since
 * forgotten half of it still passed it, and PHOS refusing to record
 * that would be arguing with their history.
 *
 * The one-exam-at-a-time rule is dropped for the same reason: a
 * completed exam competes for no days.
 *
 * The date must be in the *past*, which is the one new rule — a future
 * date here would be a booking, and bookings go through
 * `scheduleExam()` so they actually get a schedule.
 */
export async function recordPastExam(input: PastExamInput): Promise<ExamOverviewDTO> {
  const correlationId = generateCorrelationId();

  let examDate: Date | null = null;
  if (input.examDate) {
    examDate = new Date(input.examDate);
    if (Number.isNaN(examDate.getTime())) {
      throw new ValidationError('Field "examDate" is not a valid date.', correlationId);
    }
    if (startOfLocalDay(examDate).getTime() > startOfLocalDay(new Date()).getTime()) {
      throw new ValidationError(
        "That date is in the future. Use Schedule to book an exam you have not sat yet.",
        correlationId,
      );
    }
  }

  const { stage, juzNumbers } = resolveScope(input, correlationId);

  await container.examRepository.recordPast({ stage, juzNumbers, examDate });

  return getExamOverview();
}
