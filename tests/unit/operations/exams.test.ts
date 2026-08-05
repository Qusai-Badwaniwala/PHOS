import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExamStatus, MemoryState, type Exam, type Page } from "@/shared/types";
import { EXAM_LADDER, JUZ_END_PAGE } from "@/shared/constants";

/**
 * The guards on booking an exam.
 *
 * Every one of these exists because the alternative is a coverage
 * schedule that quietly fails to cover the syllabus — the single
 * failure the whole feature is built to prevent.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

const adaptiveEngine = vi.hoisted(() => ({
  getExamStages: vi.fn(),
  getActiveExam: vi.fn(),
  getExamPlan: vi.fn(),
  getExamCoverage: vi.fn(),
  getExamAftermath: vi.fn(),
}));
const examRepository = vi.hoisted(() => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  recordPast: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
}));
const pageRepository = vi.hoisted(() => ({ findAll: vi.fn() }));
const settingsRepository = vi.hoisted(() => ({ getSettings: vi.fn() }));

vi.mock("@/client/container", () => ({
  container: { adaptiveEngine, examRepository, pageRepository, settingsRepository },
}));

const { scheduleExam, markExamPassed, cancelExam, recordPastExam, getExamOverview } =
  await import("@/client/operations/exams");

function pagesOfJuz(juzNumber: number): number[] {
  const end = JUZ_END_PAGE[juzNumber - 1]!;
  const start = juzNumber === 1 ? 1 : JUZ_END_PAGE[juzNumber - 2]! + 1;
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function mushaf(juzNumbers: readonly number[], unseenJuz: readonly number[] = []): Page[] {
  return juzNumbers.flatMap((juz) =>
    pagesOfJuz(juz).map(
      (pageNumber) =>
        ({
          id: `page-${pageNumber}`,
          pageNumber,
          juzNumber: juz,
          memoryState: unseenJuz.includes(juz) ? MemoryState.Unseen : MemoryState.Growing,
        }) as unknown as Page,
    ),
  );
}

function exam(overrides: Partial<Exam> = {}): Exam {
  const now = new Date();
  return {
    id: "exam-1",
    stage: 1,
    juzNumbers: [30],
    examDate: new Date(Date.now() + 10 * MILLISECONDS_PER_DAY),
    includeNewMemorization: false,
    status: ExamStatus.Scheduled,
    recordedAsPast: false,
    scheduledAt: now,
    passedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function isoInDays(days: number): string {
  return new Date(Date.now() + days * MILLISECONDS_PER_DAY).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
  adaptiveEngine.getExamStages.mockResolvedValue([]);
  adaptiveEngine.getActiveExam.mockResolvedValue(null);
  adaptiveEngine.getExamCoverage.mockResolvedValue([]);
  adaptiveEngine.getExamAftermath.mockResolvedValue({
    pagesFallenBehind: 0,
    weakestPageNumbers: [],
  });
  examRepository.findAll.mockResolvedValue([]);
  examRepository.create.mockResolvedValue(exam());
  examRepository.recordPast.mockResolvedValue(exam({ recordedAsPast: true }));
  adaptiveEngine.getExamPlan.mockResolvedValue(null);
  pageRepository.findAll.mockResolvedValue(mushaf([30]));
  settingsRepository.getSettings.mockResolvedValue({ dailyAvailableMinutes: 60 });
});

describe("booking a ladder stage", () => {
  it("takes the scope from the ladder, never from the caller", async () => {
    /*
     * Accepting a stage number *and* a Juz list would let the two
     * disagree, and the roadmap would then show a stage whose contents
     * were not the stage's contents.
     */
    pageRepository.findAll.mockResolvedValue(mushaf([28, 29, 30]));

    await scheduleExam({
      stage: 2,
      juzNumbers: [1, 2, 3],
      examDate: isoInDays(14),
      includeNewMemorization: false,
    });

    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 2, juzNumbers: EXAM_LADDER[1]!.juzNumbers }),
    );
  });

  it("records the run-up choice the user made", async () => {
    await scheduleExam({ stage: 1, examDate: isoInDays(14), includeNewMemorization: true });

    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ includeNewMemorization: true }),
    );
  });

  it("refuses a stage whose pages are not all memorized", async () => {
    // The run-up revises the pages in scope. Pages never memorized
    // cannot be revised, so the schedule would silently cover less than
    // the syllabus.
    pageRepository.findAll.mockResolvedValue(mushaf([28, 29, 30], [28]));

    await expect(
      scheduleExam({ stage: 2, examDate: isoInDays(14), includeNewMemorization: false }),
    ).rejects.toThrow(/have not been memorized yet/);
    expect(examRepository.create).not.toHaveBeenCalled();
  });

  it("names how many pages are missing, rather than just refusing", async () => {
    pageRepository.findAll.mockResolvedValue(mushaf([28, 29, 30], [28]));

    await expect(
      scheduleExam({ stage: 2, examDate: isoInDays(14), includeNewMemorization: false }),
    ).rejects.toThrow(/20 of the 63 pages/);
  });

  it("rejects a stage that does not exist", async () => {
    await expect(
      scheduleExam({ stage: 99, examDate: isoInDays(14), includeNewMemorization: false }),
    ).rejects.toThrow();
  });
});

describe("the date", () => {
  it("refuses an exam with no run-up at all", async () => {
    // "Revise 380 pages today" is worse than no plan.
    await expect(
      scheduleExam({ stage: 1, examDate: isoInDays(0), includeNewMemorization: false }),
    ).rejects.toThrow(/at least a day/);
  });

  it("refuses a date so far off that a schedule means nothing", async () => {
    await expect(
      scheduleExam({ stage: 1, examDate: isoInDays(900), includeNewMemorization: false }),
    ).rejects.toThrow(/too far away/);
  });

  it("rejects a date it cannot read", async () => {
    await expect(
      scheduleExam({ stage: 1, examDate: "not a date", includeNewMemorization: false }),
    ).rejects.toThrow(/not a valid date/);
  });

  it("accepts tomorrow", async () => {
    await scheduleExam({ stage: 1, examDate: isoInDays(1), includeNewMemorization: false });

    expect(examRepository.create).toHaveBeenCalled();
  });
});

describe("one exam at a time", () => {
  it("refuses a second booking while one is active", async () => {
    // Two coverage schedules would compete for the same days and
    // neither would be honoured.
    adaptiveEngine.getActiveExam.mockResolvedValue(exam());

    await expect(
      scheduleExam({ stage: 1, examDate: isoInDays(14), includeNewMemorization: false }),
    ).rejects.toThrow(/already have an exam scheduled/);
    expect(examRepository.create).not.toHaveBeenCalled();
  });
});

describe("a self exam", () => {
  it("takes the Juz the user chose", async () => {
    pageRepository.findAll.mockResolvedValue(mushaf([5, 6, 7]));

    await scheduleExam({
      juzNumbers: [7, 5, 6],
      examDate: isoInDays(20),
      includeNewMemorization: false,
    });

    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ stage: null, juzNumbers: [5, 6, 7] }),
    );
  });

  it("de-duplicates whatever it is given", async () => {
    pageRepository.findAll.mockResolvedValue(mushaf([5]));

    await scheduleExam({
      juzNumbers: [5, 5, 5],
      examDate: isoInDays(20),
      includeNewMemorization: false,
    });

    expect(examRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ juzNumbers: [5] }),
    );
  });

  it("refuses an empty selection", async () => {
    await expect(
      scheduleExam({ juzNumbers: [], examDate: isoInDays(20), includeNewMemorization: false }),
    ).rejects.toThrow(/at least one Juz/);
  });

  it("is held to the same memorization rule as a ladder stage", async () => {
    pageRepository.findAll.mockResolvedValue(mushaf([5], [5]));

    await expect(
      scheduleExam({ juzNumbers: [5], examDate: isoInDays(20), includeNewMemorization: false }),
    ).rejects.toThrow(/have not been memorized yet/);
  });

  it("rejects a Juz that is not one of the thirty", async () => {
    await expect(
      scheduleExam({ juzNumbers: [31], examDate: isoInDays(20), includeNewMemorization: false }),
    ).rejects.toThrow();
  });
});

describe("finishing an exam", () => {
  it("marks it passed and stamps when", async () => {
    examRepository.findById.mockResolvedValue(exam());

    await markExamPassed("exam-1");

    expect(examRepository.updateStatus).toHaveBeenCalledWith(
      "exam-1",
      ExamStatus.Passed,
      expect.any(Date),
    );
  });

  it("cancels rather than deletes, so the roadmap can still say it happened", async () => {
    examRepository.findById.mockResolvedValue(exam());

    await cancelExam("exam-1");

    expect(examRepository.updateStatus).toHaveBeenCalledWith("exam-1", ExamStatus.Cancelled, null);
    expect(examRepository.delete).not.toHaveBeenCalled();
  });

  it("refuses to act on an exam that does not exist", async () => {
    examRepository.findById.mockResolvedValue(null);

    await expect(markExamPassed("nope")).rejects.toThrow(/No exam found/);
  });
});

/**
 * Exams passed before PHOS was involved.
 *
 * The rules deliberately differ from booking, and each difference is
 * load-bearing: two of `scheduleExam()`'s guards protect a *run-up*,
 * and there is no run-up to protect here.
 */
describe("recording an exam already passed", () => {
  it("stores it as passed, not as something to prepare for", async () => {
    await recordPastExam({ stage: 1, examDate: isoInDays(-400) });

    expect(examRepository.recordPast).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 1, juzNumbers: EXAM_LADDER[0]!.juzNumbers }),
    );
    // Never through the booking path, which would schedule a run-up.
    expect(examRepository.create).not.toHaveBeenCalled();
  });

  it("accepts a stage whose pages are not all memorized", async () => {
    /*
     * The single most important difference. Somebody who passed Juz
     * 26–30 two years ago and has since forgotten half of it still
     * passed it, and PHOS refusing to record that would be arguing with
     * their history.
     */
    pageRepository.findAll.mockResolvedValue(mushaf([26, 27, 28, 29, 30], [26, 27, 28, 29, 30]));

    await recordPastExam({ stage: 3, examDate: null });

    expect(examRepository.recordPast).toHaveBeenCalled();
  });

  it("accepts one while an exam is already scheduled", async () => {
    // A completed exam competes for no days, so the one-at-a-time rule
    // has nothing to protect.
    adaptiveEngine.getActiveExam.mockResolvedValue(exam());

    await recordPastExam({ stage: 1, examDate: null });

    expect(examRepository.recordPast).toHaveBeenCalled();
  });

  it("accepts no date at all", async () => {
    await recordPastExam({ stage: 1 });

    expect(examRepository.recordPast).toHaveBeenCalledWith(
      expect.objectContaining({ examDate: null }),
    );
  });

  it("refuses a date in the future, which would be a booking", async () => {
    await expect(recordPastExam({ stage: 1, examDate: isoInDays(30) })).rejects.toThrow(
      /in the future/,
    );
    expect(examRepository.recordPast).not.toHaveBeenCalled();
  });

  it("accepts a custom scope, for a ladder somebody else's madrasa uses", async () => {
    await recordPastExam({ juzNumbers: [7, 5, 6], examDate: null });

    expect(examRepository.recordPast).toHaveBeenCalledWith(
      expect.objectContaining({ stage: null, juzNumbers: [5, 6, 7] }),
    );
  });

  it("still refuses an empty scope", async () => {
    await expect(recordPastExam({ juzNumbers: [] })).rejects.toThrow(/at least one Juz/);
  });
});

describe("the fallen-behind report", () => {
  const passedExam = (overrides: Partial<Exam> = {}) =>
    exam({
      status: ExamStatus.Passed,
      passedAt: new Date(),
      examDate: new Date(Date.now() - MILLISECONDS_PER_DAY),
      ...overrides,
    });

  it("reports what an exam PHOS ran actually cost", async () => {
    examRepository.findAll.mockResolvedValue([passedExam()]);
    adaptiveEngine.getExamAftermath.mockResolvedValue({
      pagesFallenBehind: 11,
      weakestPageNumbers: [3, 8],
    });

    const overview = await getExamOverview();

    expect(overview.aftermath?.pagesFallenBehind).toBe(11);
  });

  it("never reports one for an exam PHOS only heard about", async () => {
    /*
     * The trap this exists to close. Record a madrasa exam today and,
     * without the guard, PHOS would announce "31 pages fell behind
     * while you prepared" — inventing a consequence out of an unrelated
     * backlog, for a run-up it never ran.
     */
    examRepository.findAll.mockResolvedValue([passedExam({ recordedAsPast: true })]);
    adaptiveEngine.getExamAftermath.mockResolvedValue({
      pagesFallenBehind: 31,
      weakestPageNumbers: [3, 8],
    });

    const overview = await getExamOverview();

    expect(overview.aftermath).toBeNull();
    expect(adaptiveEngine.getExamAftermath).not.toHaveBeenCalled();
  });

  it("still lists a recorded past exam among those passed", async () => {
    // Suppressed from the aftermath, not from the record.
    examRepository.findAll.mockResolvedValue([passedExam({ recordedAsPast: true })]);

    const overview = await getExamOverview();

    expect(overview.past).toHaveLength(1);
    expect(overview.past[0]!.recordedAsPast).toBe(true);
  });
});
