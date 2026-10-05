import { examOps } from "@/client/operations";
import { formatDatePreferred, formatPageList } from "@/lib/format";
import { ExamStageState, ExamStatus } from "@/shared/types";
import type { ExamOverviewDTO as EngineExamOverview } from "@/shared/dto";
import type { ExamCardDTO, ExamOverviewDTO, ExamRunUpDTO, ExamStageCardDTO } from "@/types/dto";

/**
 * Turns the engine's exam view into what the Dashboard renders.
 *
 * The wording lives here, beside the numbers that justify it, for the
 * same reason the goal card's does: it is the part the user reads. Two
 * rules hold it together.
 *
 * **A locked stage explains itself.** "Locked" with no reason reads as
 * PHOS withholding a feature. It is not — the run-up revises the pages
 * in scope, and pages never memorized cannot be revised, so the card
 * says how many are left rather than just refusing.
 *
 * **An oversized run-up is stated, not softened.** When the scope will
 * not fit the user's daily time PHOS says so in plain minutes and says
 * it is scheduling it anyway. Burying that would leave someone
 * discovering on the day that they had been quietly under-prepared.
 */
function toStageCard(stage: EngineExamOverview["stages"][number]): ExamStageCardDTO {
  const remaining = stage.pagesInScope - stage.pagesMemorized;

  return {
    stage: stage.stage,
    label: stage.label,
    state: stage.state as ExamStageState,
    pagesMemorized: stage.pagesMemorized,
    pagesInScope: stage.pagesInScope,
    examId: stage.examId,
    examDate: stage.examDate ? formatDatePreferred(stage.examDate) : null,
    detail:
      stage.state === ExamStageState.Locked
        ? `${remaining} of ${stage.pagesInScope} pages still to memorize`
        : stage.state === ExamStageState.Passed
          ? "Passed"
          : stage.state === ExamStageState.Scheduled
            ? `Scheduled for ${stage.examDate ? formatDatePreferred(stage.examDate) : "a date you chose"}`
            : `Ready — all ${stage.pagesInScope} pages memorized`,
  };
}

function toExamCard(exam: EngineExamOverview["past"][number]): ExamCardDTO {
  return {
    id: exam.id,
    stage: exam.stage,
    scopeLabel: exam.scopeLabel,
    /*
     * `null` when the user recorded an exam without saying when. The
     * card renders that as "before you started PHOS" rather than
     * inventing a date, which is the whole reason the field is
     * optional.
     */
    examDate: exam.examDate ? formatDatePreferred(exam.examDate) : null,
    recordedAsPast: exam.recordedAsPast,
    includeNewMemorization: exam.includeNewMemorization,
    status: exam.status as ExamStatus,
  };
}

function toRunUp(overview: EngineExamOverview): ExamRunUpDTO | null {
  const { active, activePlan } = overview;
  if (!active || !activePlan) return null;

  const daysLeft = activePlan.daysRemaining - 1;
  const pages = activePlan.todaysPageNumbers;

  return {
    exam: toExamCard(active),
    daysRemaining: daysLeft,
    pagesInScope: activePlan.pagesInScope,
    pagesPerDay: activePlan.pagesPerDay,
    todaysPages: pages,
    todaysRange: pages.length === 0 ? "Nothing left to cover" : formatPageList(pages),
    summary:
      daysLeft <= 0
        ? `${active.scopeLabel} — today.`
        : daysLeft === 1
          ? `${active.scopeLabel} — tomorrow.`
          : `${active.scopeLabel} — in ${daysLeft} days.`,
    // Said plainly, and immediately followed by what PHOS is doing
    // about it, so the user is never left holding a warning with no
    // explanation of the response.
    budgetWarning: activePlan.exceedsDailyBudget
      ? `Covering this before the exam takes about ${activePlan.estimatedMinutesPerDay} minutes a day, more than the time you set aside. PHOS is dividing it evenly anyway rather than leaving part of the syllabus unrevised.`
      : null,
    coverage: overview.activeCoverage.map((day) => ({
      date: formatDatePreferred(day.date),
      pageNumbers: day.pageNumbers,
    })),
    /*
     * Stated up front, because the absence of the user's usual revision
     * is the most visible change exam mode makes and would otherwise
     * look like a fault.
     */
    setAsideNote:
      "Revision outside this exam is paused until you mark it passed. PHOS will tell you what fell behind then.",
  };
}

export async function getExamOverview(): Promise<ExamOverviewDTO> {
  const overview = await examOps.getExamOverview();

  return {
    stages: overview.stages.map(toStageCard),
    runUp: toRunUp(overview),
    past: overview.past.map(toExamCard),
    awaitingResult: (overview.awaitingResult ?? []).map(toExamCard),
    aftermath: overview.aftermath
      ? {
          pagesFallenBehind: overview.aftermath.pagesFallenBehind,
          weakestPageNumbers: overview.aftermath.weakestPageNumbers,
          // Framed as work resuming, not as damage. Pages falling
          // behind during an exam is the expected cost of the trade the
          // user made deliberately, not a failure on their part.
          summary: `${overview.aftermath.pagesFallenBehind} ${
            overview.aftermath.pagesFallenBehind === 1 ? "page" : "pages"
          } fell behind while you prepared. They are back in your revision from today.`,
        }
      : null,
  };
}

export async function scheduleExam(input: {
  stage?: number | null;
  juzNumbers?: readonly number[];
  examDate: string;
  includeNewMemorization: boolean;
}): Promise<ExamOverviewDTO> {
  await examOps.scheduleExam(input);
  return getExamOverview();
}

/**
 * Records an exam the user passed before PHOS was involved.
 *
 * `examDate` may be omitted entirely — nobody remembers the day they
 * sat Juz 30, and inventing one would be worse than saying "before you
 * started PHOS".
 */
export async function recordPastExam(input: {
  stage?: number | null;
  juzNumbers?: readonly number[];
  examDate?: string | null;
}): Promise<ExamOverviewDTO> {
  await examOps.recordPastExam(input);
  return getExamOverview();
}

export async function markExamPassed(examId: string): Promise<ExamOverviewDTO> {
  await examOps.markExamPassed(examId);
  return getExamOverview();
}

export async function cancelExam(examId: string): Promise<ExamOverviewDTO> {
  await examOps.cancelExam(examId);
  return getExamOverview();
}
