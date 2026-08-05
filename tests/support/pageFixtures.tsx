import type { AppSettings } from "@/lib/api/settings";
import type { AnalyticsDTO, DashboardDTO, HistoryDTO, RevisionDTO, SessionDTO } from "@/types/dto";

/**
 * Realistic screen data for the page tests.
 *
 * Deliberately complete rather than minimal: these fixtures stand in
 * for what a real day looks like, so a page rendered against them
 * exercises the same branches a user would hit.
 */

export const SETTINGS: AppSettings = {
  general: { language: "en", dateFormat: "mdy", timeFormat: "12h" },
  appearance: { theme: "system", reducedMotion: false, compactMode: false },
  session: { showTimer: true, showProgress: true, confirmCompletion: false },
  revision: { showProgress: true },
  onboarding: {
    completed: true,
    completedAt: new Date(2026, 7, 1).toISOString(),
    memorizationLevel: "Beginner",
    pagesAlreadyMemorized: 0,
    dailyAvailableMinutes: 45,
    comfortableDailyPages: 1,
    followsExistingSchedule: false,
    revisionStartsImmediately: true,
  },
  memorizationOrder: "Standard",
  goal: null,
  revisionSchedule: { mode: "Adaptive", cycleLengthDays: 7, cycleStartedAt: null },
};

export const DASHBOARD: DashboardDTO = {
  session: {
    id: "page-53",
    status: "not_started",
    assignment: {
      startPage: 53,
      endPage: 53,
      target: "Page 53",
      surah: "Aal-Imran",
      surahArabic: "آل عمران",
      juzNumber: 3,
    },
    progress: { current: 0, total: 1 },
    estimatedTime: "2 min",
  },
  revision: {
    id: "page-10",
    status: "not_started",
    assignment: { type: "sabqi", pages: ["Page 10", "Page 11"], totalPages: 2, juzNumber: 1 },
    progress: { current: 0, total: 2 },
    estimatedTime: "4 min",
  },
  stats: { memorizedPages: 23, revisionQueue: 2, weeklyProgress: 60 },
  memoryHealth: 72,
  retentionQuality: 81,
  weeklyProgress: [
    { day: "Sun", completed: true },
    { day: "Mon", completed: false },
    { day: "Tue", completed: true },
    { day: "Wed", completed: false },
    { day: "Thu", completed: false },
    { day: "Fri", completed: false },
    { day: "Sat", completed: false },
  ],
  recentActivity: [
    {
      id: "session-1",
      type: "session",
      title: "Completed session",
      date: "08/03/2026",
      status: "completed",
    },
  ],
  planExplanation: {
    headline: "A steady day.",
    details: ["One new page.", "Two pages of revision."],
  },
  welcomeBackMessage: null,
  workloadWarning: null,
  goal: null,
  weeklyReview: {
    pagesCompleted: 6,
    sessionsCompleted: 4,
    recallsRecorded: 41,
    recallTrend: "Steady",
    trendSummary: "Your recall has held steady since last week.",
  },
};

export const SESSION: SessionDTO = {
  id: "session-1",
  status: "not_started",
  title: "Memorization Session",
  assignment: { startPage: 53, endPage: 53, target: "Page 53" },
  studyPages: [
    { pageId: "p53", pageNumber: 53, surahs: [{ name: "Aal-Imran", arabicName: "آل عمران" }] },
  ],
  progress: { current: 0, total: 1 },
  estimatedTime: "2 min",
};

export const REVISION: RevisionDTO = {
  id: "revision-1",
  status: "not_started",
  title: "Revision Session",
  assignment: { type: "sabqi", pages: ["Page 10", "Page 11"], totalPages: 2 },
  studyPages: [
    { pageId: "p10", pageNumber: 10, surahs: [{ name: "Al-Baqarah", arabicName: "البقرة" }] },
    { pageId: "p11", pageNumber: 11, surahs: [{ name: "Al-Baqarah", arabicName: "البقرة" }] },
  ],
  progress: { current: 0, total: 2 },
  estimatedTime: "4 min",
};

export const ANALYTICS: AnalyticsDTO = {
  summary: {
    totalMemorized: 23,
    revisionCompleted: 4,
    completionRate: 80,
    averageSessionTime: "9 min",
  },
  progressOverTime: [{ label: "08/03/2026", value: 2 }],
  revisionActivity: [{ label: "08/03/2026", value: 3 }],
  sessionFrequency: [{ label: "08/03/2026", value: 1 }],
  memoryStrengthDistribution: [
    { label: "Growing", value: 12 },
    { label: "Stable", value: 11 },
  ],
  learningTrends: [{ label: "Weekly", value: 50 }],
  retentionDecay: [{ label: "08/03/2026", value: 90 }],
  timeline: [
    {
      id: "session-1",
      type: "session",
      title: "Completed session",
      date: "08/03/2026",
      time: "9:00 AM",
      description: "2 page(s), 2 recall(s)",
      status: "completed",
    },
  ],
};

export const HISTORY: HistoryDTO = {
  entries: [
    {
      id: "session-1",
      type: "session",
      title: "Completed session",
      date: "08/03/2026",
      time: "9:00 AM",
      description: "2 page(s), 2 recall(s)",
      status: "completed",
    },
  ],
  totalCount: 1,
};

/** The shape every data hook in `lib/hooks` returns. */
export function hookResult<T>(
  overrides: Partial<{ data: T | null; loading: boolean; error: Error | null }> = {},
) {
  return {
    data: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}
