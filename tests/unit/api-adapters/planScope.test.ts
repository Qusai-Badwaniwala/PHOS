import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionType, WorkloadCategory } from "@/shared/types";
import type { ActiveSessionDTO, DailyStudyPlanDTO, SettingsDTO } from "@/shared/dto";

/**
 * The adapters read the plan and the active session through
 * `client/operations`, which reaches the real engines and IndexedDB.
 * These tests are about how the adapters *scope* a plan they are given,
 * so the operations are replaced with fakes rather than a whole
 * database being stood up to produce one specific plan.
 */
const ops = vi.hoisted(() => ({
  getTodayPlan: vi.fn(),
  getActiveSession: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock("@/client/operations", () => ({
  sessionOps: { getTodayPlan: ops.getTodayPlan, getActiveSession: ops.getActiveSession },
  settingsOps: { getSettings: ops.getSettings },
  backupOps: { DATA_RESET_CONFIRMATION: "DELETE" },
}));

const { getRevision } = await import("@/lib/api/revision");
const { getSession } = await import("@/lib/api/session");

interface FakeItem {
  pageId: string;
  pageNumber: number;
  memoryState: string;
  workloadCategory: WorkloadCategory;
  recommendedOrder: number;
  estimatedDuration: number;
}

function item(pageNumber: number, workloadCategory: WorkloadCategory): FakeItem {
  return {
    pageId: `page-${pageNumber}`,
    pageNumber,
    memoryState: "Growing",
    workloadCategory,
    recommendedOrder: pageNumber,
    estimatedDuration: 60,
  };
}

interface FakeActiveSession {
  sessionId: string;
  sessionType: SessionType;
  startedAt: string;
  completedPageIds: string[];
}

/** Enough of a Settings row for `getDailyStudyMinutes()` to read a budget. */
const FAKE_SETTINGS = {
  theme: "system",
  ayahRotationFrequency: 1,
  personalization: { theme: "system", ayahRotationFrequency: 1 },
  preferences: {
    dateFormat: "mdy",
    timeFormat: "12h",
    reducedMotion: false,
    compactMode: false,
    sessionShowTimer: true,
    sessionShowProgress: true,
    sessionConfirmCompletion: false,
    revisionShowProgress: true,
  },
  onboarding: {
    completed: true,
    completedAt: new Date().toISOString(),
    memorizationLevel: "Beginner",
    pagesAlreadyMemorized: 0,
    dailyAvailableMinutes: 60,
    comfortableDailyPages: 1,
    followsExistingSchedule: false,
    revisionStartsImmediately: true,
  },
  memorizationOrder: "Standard",
} satisfies SettingsDTO;

/**
 * Supplies the plan and active session these adapters read. The plan is
 * given in Adaptive Engine priority order (Recovery > Overdue > Recent >
 * LongTerm > New), matching what the engine really produces.
 *
 * The active session is set explicitly rather than incidentally, because
 * the adapters treat the persisted session row — not local storage — as
 * the authority on whether a session is in progress.
 */
function stubPlan(studyItems: FakeItem[], activeSession: FakeActiveSession | null = null) {
  ops.getSettings.mockResolvedValue(FAKE_SETTINGS);
  ops.getTodayPlan.mockResolvedValue({
    studyItems,
    estimatedTotalDurationSeconds: studyItems.length * 60,
    recoveryRecommended: false,
  } as unknown as DailyStudyPlanDTO);
  ops.getActiveSession.mockResolvedValue(activeSession as ActiveSessionDTO | null);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("selects only new-memorization work", async () => {
    stubPlan([
      item(10, WorkloadCategory.OverdueRevision),
      item(20, WorkloadCategory.NewMemorization),
      item(21, WorkloadCategory.NewMemorization),
    ]);

    const session = await getSession();

    expect(session?.progress.total).toBe(2);
    expect(session?.assignment?.startPage).toBe(20);
    expect(session?.assignment?.endPage).toBe(21);
  });

  it("returns null when nothing new is scheduled", async () => {
    stubPlan([item(10, WorkloadCategory.OverdueRevision)]);
    await expect(getSession()).resolves.toBeNull();
  });
});

/**
 * A revision assignment must correspond to exactly one `SessionType`,
 * because starting a session commits to one type and the Learning
 * Engine scopes the session's plan to that type's categories. If the UI
 * offered a mixed-category assignment, the pages submitted on
 * completion would not match the pages the engine expects.
 */
describe("getRevision scopes the assignment to a single session type", () => {
  it("takes only Recovery work when recovery is the highest priority", async () => {
    stubPlan([
      item(1, WorkloadCategory.Recovery),
      item(2, WorkloadCategory.OverdueRevision),
      item(3, WorkloadCategory.LongTermRevision),
      item(4, WorkloadCategory.NewMemorization),
    ]);

    const revision = await getRevision();

    expect(revision?.assignment?.type).toBe("recovery");
    expect(revision?.assignment?.pages).toEqual(["Page 1"]);
  });

  it("groups overdue and recent revision together as one Sabqi assignment", async () => {
    stubPlan([
      item(1, WorkloadCategory.OverdueRevision),
      item(2, WorkloadCategory.RecentRevision),
      item(3, WorkloadCategory.LongTermRevision),
      item(4, WorkloadCategory.NewMemorization),
    ]);

    const revision = await getRevision();

    expect(revision?.assignment?.type).toBe("sabqi");
    // LongTerm belongs to Manzil, so it must not be swept into this one.
    expect(revision?.assignment?.pages).toEqual(["Page 1", "Page 2"]);
    expect(revision?.assignment?.totalPages).toBe(2);
  });

  it("takes only long-term work when that is all the revision there is", async () => {
    stubPlan([
      item(3, WorkloadCategory.LongTermRevision),
      item(4, WorkloadCategory.NewMemorization),
    ]);

    const revision = await getRevision();

    expect(revision?.assignment?.type).toBe("manzil");
    expect(revision?.assignment?.pages).toEqual(["Page 3"]);
  });

  it("returns null when only new memorization is scheduled", async () => {
    stubPlan([item(4, WorkloadCategory.NewMemorization)]);
    await expect(getRevision()).resolves.toBeNull();
  });
});

/**
 * The persisted session row is the authority on whether a session is in
 * progress, not the client's own cached record. Before this, losing the
 * engine's in-memory state left the UI insisting a session was running
 * when nothing backed that up — every action failed with no way out.
 */
describe("in-progress state is taken from the persisted session", () => {
  const activeSabaq: FakeActiveSession = {
    sessionId: "session-1",
    sessionType: SessionType.Sabaq,
    startedAt: new Date().toISOString(),
    completedPageIds: ["page-20"],
  };

  it("reports a session as in progress when a session row is open", async () => {
    stubPlan([item(21, WorkloadCategory.NewMemorization)], activeSabaq);

    const session = await getSession();

    expect(session?.status).toBe("in_progress");
    expect(session?.id).toBe("session-1");
    // Progress comes from the persisted record of completed pages, so
    // it stays correct across a reload.
    expect(session?.progress.current).toBe(1);
  });

  it("falls back to not_started when no session row is open", async () => {
    stubPlan([item(20, WorkloadCategory.NewMemorization)], null);

    const session = await getSession();

    expect(session?.status).toBe("not_started");
  });

  it("does not treat an open Sabaq session as a revision in progress", async () => {
    stubPlan([item(1, WorkloadCategory.OverdueRevision)], activeSabaq);

    const revision = await getRevision();

    expect(revision?.status).toBe("not_started");
  });

  it("reports a revision as in progress for a revision session type", async () => {
    stubPlan([item(1, WorkloadCategory.OverdueRevision)], {
      ...activeSabaq,
      sessionType: SessionType.Sabqi,
      completedPageIds: [],
    });

    const revision = await getRevision();

    expect(revision?.status).toBe("in_progress");
    expect(revision?.assignment?.type).toBe("sabqi");
  });
});
