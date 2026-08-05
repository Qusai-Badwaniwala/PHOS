import type { ExamStageDefinition } from "../types/exam";

/**
 * The fixed exam ladder (Phase 11).
 *
 * WHY IT IS FIXED
 * ---------------
 * This is not PHOS's opinion about how to be examined — it is the
 * sequence Hifz institutions actually use, and the whole value of
 * showing it is that a student recognises their own syllabus in it.
 * Making it configurable would turn a shared reference into one more
 * thing to set up, and a student whose madrasa uses a different ladder
 * is better served by Self Exam, which asks for the Juz directly.
 *
 * WHY THE SHAPE IS WHAT IT IS
 * ---------------------------
 * The last five Juz come first because they are short, familiar, and
 * where nearly every Hifz begins. From the fourth stage onward the
 * ladder carries 26–30 forward alongside a growing block from Juz 1, so
 * a student is re-examined on the earliest material rather than
 * allowed to leave it behind — which is the point of an exam ladder
 * rather than a series of unrelated tests.
 */
function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

export const EXAM_LADDER: readonly ExamStageDefinition[] = [
  { stage: 1, juzNumbers: [30], label: "Juz 30" },
  { stage: 2, juzNumbers: range(28, 30), label: "Juz 28–30" },
  { stage: 3, juzNumbers: range(26, 30), label: "Juz 26–30" },
  { stage: 4, juzNumbers: [...range(1, 5), ...range(26, 30)], label: "Juz 1–5 + 26–30" },
  { stage: 5, juzNumbers: [...range(1, 10), ...range(26, 30)], label: "Juz 1–10 + 26–30" },
  { stage: 6, juzNumbers: [...range(1, 15), ...range(26, 30)], label: "Juz 1–15 + 26–30" },
  { stage: 7, juzNumbers: [...range(1, 20), ...range(26, 30)], label: "Juz 1–20 + 26–30" },
  { stage: 8, juzNumbers: range(1, 30), label: "The whole Quran" },
];

/** The last rung, so callers do not hard-code 8. */
export const FINAL_EXAM_STAGE = EXAM_LADDER[EXAM_LADDER.length - 1]!.stage;

/**
 * The shortest run-up PHOS will schedule.
 *
 * An exam booked for tomorrow cannot be covered in any meaningful
 * sense, and pretending otherwise would produce a "revise 380 pages
 * today" plan that is worse than no plan.
 */
export const MINIMUM_EXAM_RUNUP_DAYS = 1;

/**
 * How far ahead an exam may be booked.
 *
 * Two years is past the point where a coverage schedule says anything
 * useful — a page revised once every eleven days is just normal
 * revision wearing an exam's name.
 */
export const MAXIMUM_EXAM_RUNUP_DAYS = 730;

/** Finds a ladder stage by number. */
export function examStage(stage: number): ExamStageDefinition | null {
  return EXAM_LADDER.find((definition) => definition.stage === stage) ?? null;
}

/**
 * A readable label for any set of Juz, e.g. "Juz 1–5 + 26–30".
 *
 * Used for Self Exams, which have no fixed label, and to keep the
 * ladder's own labels honest — a definition whose label disagreed with
 * its Juz would be a silent lie on the roadmap.
 */
export function describeJuzScope(juzNumbers: readonly number[]): string {
  const sorted = [...new Set(juzNumbers)].sort((a, b) => a - b);
  if (sorted.length === 0) return "No Juz";

  const runs: string[] = [];
  let start = sorted[0]!;
  let previous = start;

  for (const juz of sorted.slice(1)) {
    if (juz === previous + 1) {
      previous = juz;
      continue;
    }
    runs.push(start === previous ? `${start}` : `${start}–${previous}`);
    start = juz;
    previous = juz;
  }
  runs.push(start === previous ? `${start}` : `${start}–${previous}`);

  return `Juz ${runs.join(" + ")}`;
}
