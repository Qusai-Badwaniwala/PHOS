import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExamStageState, ExamStatus } from "@/shared/types";
import type { ExamOverviewDTO, ExamRunUpDTO, ExamStageCardDTO } from "@/types/dto";

/**
 * The exam screens carry two messages that are easy to lose and
 * expensive to lose: a locked stage must say *why*, and an exam run-up
 * must say that ordinary revision has been paused. Without the second,
 * a user whose usual revision has vanished reads it as a fault.
 */
const getExamOverview = jest.fn();
const scheduleExam = jest.fn();
const markExamPassed = jest.fn();
const cancelExam = jest.fn();
const recordPastExam = jest.fn();

jest.mock("@/lib/api/exams", () => ({
  getExamOverview: () => getExamOverview(),
  scheduleExam: (...args: unknown[]) => scheduleExam(...args),
  markExamPassed: (...args: unknown[]) => markExamPassed(...args),
  cancelExam: (...args: unknown[]) => cancelExam(...args),
  recordPastExam: (...args: unknown[]) => recordPastExam(...args),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { ExamSection } = require("@/components/exams/exam-section") as {
  ExamSection: React.ComponentType<{ onChanged?: () => void }>;
};
const { ExamLadder } = require("@/components/exams/exam-ladder") as {
  ExamLadder: React.ComponentType<{
    stages: readonly ExamStageCardDTO[];
    onSchedule: ((stage: ExamStageCardDTO) => void) | null;
  }>;
};
const { ExamRunUpCard } = require("@/components/exams/exam-run-up") as {
  ExamRunUpCard: React.ComponentType<{
    runUp: ExamRunUpDTO;
    onMarkPassed: () => void;
    onCancel: () => void;
  }>;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function stage(overrides: Partial<ExamStageCardDTO> = {}): ExamStageCardDTO {
  return {
    stage: 1,
    label: "Juz 30",
    state: ExamStageState.Available,
    pagesMemorized: 23,
    pagesInScope: 23,
    examId: null,
    examDate: null,
    detail: "Ready — all 23 pages memorized",
    ...overrides,
  };
}

function runUp(overrides: Partial<ExamRunUpDTO> = {}): ExamRunUpDTO {
  return {
    exam: {
      id: "exam-1",
      stage: 1,
      scopeLabel: "Juz 30",
      examDate: "15/08/2026",
      includeNewMemorization: false,
      recordedAsPast: false,
      status: ExamStatus.Scheduled,
    },
    daysRemaining: 4,
    pagesInScope: 23,
    pagesPerDay: 5,
    todaysPages: [582, 583, 584, 585, 586],
    todaysRange: "Pages 582–586",
    summary: "Juz 30 — in 4 days.",
    budgetWarning: null,
    coverage: [
      { date: "05/08/2026", pageNumbers: [582, 583, 584, 585, 586] },
      { date: "06/08/2026", pageNumbers: [587, 588, 589, 590, 591] },
    ],
    setAsideNote:
      "Revision outside this exam is paused until you mark it passed. PHOS will tell you what fell behind then.",
    ...overrides,
  };
}

function overview(overrides: Partial<ExamOverviewDTO> = {}): ExamOverviewDTO {
  return {
    stages: [
      stage(),
      stage({
        stage: 2,
        label: "Juz 28–30",
        state: ExamStageState.Locked,
        pagesMemorized: 23,
        pagesInScope: 63,
        detail: "40 of 63 pages still to memorize",
      }),
    ],
    runUp: null,
    past: [],
    aftermath: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getExamOverview.mockResolvedValue(overview());
});

describe("the ladder", () => {
  it("shows locked stages rather than hiding them", () => {
    // Hiding them would make the roadmap shorter as it went, which is
    // exactly backwards.
    render(<ExamLadder stages={overview().stages} onSchedule={jest.fn()} />);

    expect(screen.getByText("Juz 28–30")).toBeInTheDocument();
  });

  it("says why a stage is locked, in pages", () => {
    // "Locked" with no reason reads as PHOS withholding a feature.
    render(<ExamLadder stages={overview().stages} onSchedule={jest.fn()} />);

    expect(screen.getByText("40 of 63 pages still to memorize")).toBeInTheDocument();
  });

  it("offers Schedule only on a stage that is actually ready", () => {
    render(<ExamLadder stages={overview().stages} onSchedule={jest.fn()} />);

    expect(screen.getAllByRole("button", { name: "Schedule Juz 30" })).toHaveLength(1);
  });

  it("offers nothing to schedule while an exam is already booked", () => {
    render(<ExamLadder stages={overview().stages} onSchedule={null} />);

    expect(screen.queryByRole("button", { name: "Schedule Juz 30" })).not.toBeInTheDocument();
  });
});

describe("the run-up card", () => {
  it("says what today asks and when the exam is", () => {
    render(<ExamRunUpCard runUp={runUp()} onMarkPassed={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText("Pages 582–586")).toBeInTheDocument();
    expect(screen.getByText("Juz 30 — in 4 days.")).toBeInTheDocument();
  });

  it("says plainly that ordinary revision is paused", () => {
    // The most visible change exam mode makes. Its absence would read
    // as a bug.
    render(<ExamRunUpCard runUp={runUp()} onMarkPassed={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText(/Revision outside this exam is paused/)).toBeInTheDocument();
  });

  it("shows the budget warning without softening it", () => {
    render(
      <ExamRunUpCard
        runUp={runUp({
          budgetWarning:
            "Covering this before the exam takes about 120 minutes a day, more than the time you set aside. PHOS is dividing it evenly anyway rather than leaving part of the syllabus unrevised.",
        })}
        onMarkPassed={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText(/120 minutes a day/)).toBeInTheDocument();
    expect(
      screen.getByText(/rather than leaving part of the syllabus unrevised/),
    ).toBeInTheDocument();
  });

  it("keeps the full schedule available but out of the way", async () => {
    const user = userEvent.setup();
    render(<ExamRunUpCard runUp={runUp()} onMarkPassed={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByText("06/08/2026")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /See the full schedule/ }));
    expect(screen.getByText("06/08/2026")).toBeInTheDocument();
  });

  it("lets the user say they passed", async () => {
    const user = userEvent.setup();
    const onMarkPassed = jest.fn();
    render(<ExamRunUpCard runUp={runUp()} onMarkPassed={onMarkPassed} onCancel={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: /I passed this exam/ }));
    await user.click(screen.getByRole("button", { name: "Record passed exam" }));

    expect(onMarkPassed).toHaveBeenCalled();
  });
});

describe("the exam section", () => {
  it("says what fell behind, only after the exam is over", async () => {
    getExamOverview.mockResolvedValue(
      overview({
        aftermath: {
          pagesFallenBehind: 11,
          weakestPageNumbers: [3, 8, 14],
          summary:
            "11 pages fell behind while you prepared. They are back in your revision from today.",
        },
      }),
    );

    render(<ExamSection />);

    expect(await screen.findByText(/11 pages fell behind/)).toBeInTheDocument();
    expect(screen.getByText(/Starting with 3, 8, 14/)).toBeInTheDocument();
  });

  it("does not mention what is falling behind during the run-up", async () => {
    // A student a week from an exam cannot act on it, and showing it
    // would divide their attention at the worst moment.
    getExamOverview.mockResolvedValue(overview({ runUp: runUp(), aftermath: null }));

    render(<ExamSection />);
    await screen.findByText(/Juz 30 — in 4 days./);

    // The run-up card does promise to report this *later*, which is the
    // point. What must not appear is a count — a number of pages
    // slipping right now, which the user cannot act on.
    expect(screen.queryByText(/\d+ pages? fell behind/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Starting with/)).not.toBeInTheDocument();
    expect(screen.getByText(/PHOS will tell you what fell behind then/)).toBeInTheDocument();
  });

  it("keeps a record of a passed Self Exam, which has no place on the ladder", async () => {
    /*
     * Found by the product owner: pass a Self Exam and every trace of it
     * disappeared. The ladder can only show the eight fixed stages, and
     * a Self Exam has `stage: null`, so it appeared nowhere at all.
     */
    getExamOverview.mockResolvedValue(
      overview({
        past: [
          {
            id: "self-1",
            stage: null,
            scopeLabel: "Juz 5–6",
            examDate: "12/08/2026",
            includeNewMemorization: false,
            recordedAsPast: false,
            status: ExamStatus.Passed,
          },
        ],
      }),
    );

    render(<ExamSection />);

    expect(await screen.findByText("Juz 5–6")).toBeInTheDocument();
    expect(screen.getByText(/Your own exam/)).toBeInTheDocument();
  });

  it("distinguishes a passed ladder stage from a passed self exam", async () => {
    getExamOverview.mockResolvedValue(
      overview({
        past: [
          {
            id: "stage-1",
            stage: 1,
            scopeLabel: "Juz 30",
            examDate: "01/08/2026",
            includeNewMemorization: false,
            recordedAsPast: false,
            status: ExamStatus.Passed,
          },
        ],
      }),
    );

    render(<ExamSection />);

    expect(await screen.findByText("Stage 1 · Juz 30")).toBeInTheDocument();
    expect(screen.queryByText(/Your own exam/)).not.toBeInTheDocument();
  });

  it("shows no past-exams card at all before anything has been passed", async () => {
    // An empty "Exams you have passed" heading on day one would read as
    // a scoreboard with nothing on it.
    render(<ExamSection />);
    await screen.findByRole("list", { name: "Exam roadmap" });

    expect(screen.queryByText(/Exams you have passed/)).not.toBeInTheDocument();
  });

  it("explains why a second exam cannot be booked, rather than just disabling the buttons", async () => {
    getExamOverview.mockResolvedValue(overview({ runUp: runUp() }));

    render(<ExamSection />);

    expect(
      await screen.findByText(
        /Mark your current exam passed or cancel it before scheduling another/,
      ),
    ).toBeInTheDocument();
  });

  it("surfaces a refusal from the engine instead of failing silently", async () => {
    const user = userEvent.setup();
    scheduleExam.mockRejectedValue(
      new Error("20 of the 63 pages in this exam have not been memorized yet."),
    );

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Schedule Juz 30" }));
    await user.type(screen.getByLabelText("Exam date"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Schedule exam" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/have not been memorized yet/);
  });
});

describe("booking an exam", () => {
  it("warns about the paused revision before the user commits, not after", async () => {
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Schedule Juz 30" }));

    expect(screen.getByText(/pauses revision outside its scope/)).toBeInTheDocument();
  });

  it("asks whether to keep memorizing, rather than assuming", async () => {
    // Guessing would be wrong about half the time, and wrong in a way
    // that quietly changes weeks of work.
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Schedule Juz 30" }));

    expect(screen.getByText("Keep memorizing new pages")).toBeInTheDocument();
    expect(screen.getByText("Revision only")).toBeInTheDocument();
  });

  it("cannot be submitted without a date", async () => {
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Schedule Juz 30" }));

    expect(screen.getByRole("button", { name: "Schedule exam" })).toBeDisabled();
  });

  it("books the stage the user chose", async () => {
    const user = userEvent.setup();
    scheduleExam.mockResolvedValue(overview());

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Schedule Juz 30" }));
    await user.type(screen.getByLabelText("Exam date"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Schedule exam" }));

    await waitFor(() => expect(scheduleExam).toHaveBeenCalledTimes(1));
    expect(scheduleExam.mock.calls[0]![0]).toMatchObject({
      stage: 1,
      includeNewMemorization: true,
    });
  });

  it("asks a self exam which Juz, and sends no stage", async () => {
    const user = userEvent.setup();
    scheduleExam.mockResolvedValue(overview());

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Self exam" }));

    await user.click(screen.getByRole("button", { name: "Juz 5" }));
    await user.click(screen.getByRole("button", { name: "Juz 6" }));
    await user.type(screen.getByLabelText("Exam date"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Schedule exam" }));

    await waitFor(() => expect(scheduleExam).toHaveBeenCalledTimes(1));
    expect(scheduleExam.mock.calls[0]![0]).toMatchObject({ stage: null, juzNumbers: [5, 6] });
  });

  it("cannot submit a self exam with no Juz chosen", async () => {
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Self exam" }));
    await user.type(screen.getByLabelText("Exam date"), "2026-12-01");

    expect(screen.getByRole("button", { name: "Schedule exam" })).toBeDisabled();
  });
});

/**
 * Recording an exam passed before PHOS was involved.
 *
 * Raised by the product owner: someone who passed three stages last
 * year met a roadmap that behaved as though none of it happened.
 */
describe("adding a past exam", () => {
  it("is offered even while an exam is scheduled", async () => {
    // A completed exam competes for no days, so the one-at-a-time rule
    // has nothing to protect here.
    getExamOverview.mockResolvedValue(overview({ runUp: runUp() }));

    render(<ExamSection />);

    expect(await screen.findByRole("button", { name: "Add a past exam" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Self exam" })).toBeDisabled();
  });

  it("says plainly that it changes nothing about scheduling", async () => {
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Add a past exam" }));

    expect(screen.getByText(/does not change your scheduling/)).toBeInTheDocument();
  });

  it("records a ladder stage with no date when none is given", async () => {
    const user = userEvent.setup();
    recordPastExam.mockResolvedValue(overview());

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Add a past exam" }));
    await user.selectOptions(screen.getByLabelText("Which stage"), "3");
    await user.click(screen.getByRole("button", { name: "Record it" }));

    await waitFor(() => expect(recordPastExam).toHaveBeenCalledTimes(1));
    expect(recordPastExam.mock.calls[0]![0]).toMatchObject({ stage: 3, examDate: null });
  });

  it("says the date is optional, rather than leaving the user guessing", async () => {
    // A required date would be either guessed at or would stop the
    // record being made at all.
    const user = userEvent.setup();
    render(<ExamSection />);

    await user.click(await screen.findByRole("button", { name: "Add a past exam" }));

    expect(screen.getByText(/Leave this empty if you do not remember/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record it" })).toBeDisabled();
  });

  it("takes a custom scope for a ladder somebody else's madrasa uses", async () => {
    const user = userEvent.setup();
    recordPastExam.mockResolvedValue(overview());

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Add a past exam" }));
    await user.click(screen.getByRole("radio", { name: /I'll choose the Juz/ }));
    await user.click(screen.getByRole("button", { name: "Juz 5" }));
    await user.click(screen.getByRole("button", { name: "Record it" }));

    await waitFor(() => expect(recordPastExam).toHaveBeenCalledTimes(1));
    expect(recordPastExam.mock.calls[0]![0]).toMatchObject({ stage: null, juzNumbers: [5] });
  });

  it("renders an undated record as 'before you started', not as a guessed date", async () => {
    getExamOverview.mockResolvedValue(
      overview({
        past: [
          {
            id: "past-1",
            stage: 3,
            scopeLabel: "Juz 26–30",
            examDate: null,
            includeNewMemorization: false,
            recordedAsPast: true,
            status: ExamStatus.Passed,
          },
        ],
      }),
    );

    render(<ExamSection />);

    expect(await screen.findByText("Stage 3 · Juz 26–30")).toBeInTheDocument();
    expect(screen.getByText("Before you started PHOS")).toBeInTheDocument();
  });

  it("surfaces a refusal rather than closing silently", async () => {
    const user = userEvent.setup();
    recordPastExam.mockRejectedValue(new Error("That date is in the future."));

    render(<ExamSection />);
    await user.click(await screen.findByRole("button", { name: "Add a past exam" }));
    await user.selectOptions(screen.getByLabelText("Which stage"), "1");
    await user.click(screen.getByRole("button", { name: "Record it" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/in the future/);
  });
});
