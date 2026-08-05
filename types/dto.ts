/**
 * PHOS Backend DTOs
 * Shared contracts between Frontend and Backend.
 * These types define exactly what the frontend expects from Claude's implementation.
 * Do not modify without architectural approval.
 */

import type { ExamStageState, ExamStatus } from "@/shared/types";

export type Theme = "light" | "dark" | "system";

export type SessionStatus = "not_started" | "in_progress" | "paused" | "completed" | "interrupted";

export type RevisionStatus = "not_started" | "in_progress" | "paused" | "completed" | "interrupted";

export type DateRange = "today" | "week" | "month" | "year" | "all";

export type ActivityType = "session" | "revision" | "backup" | "milestone" | "settings";

export type ActivityStatus = "completed" | "pending" | "failed";

export type RevisionType = "sabqi" | "manzil" | "recovery";

export type BackupStatus = "up_to_date" | "outdated" | "never";

export type BackupEntryType = "manual" | "auto";

export type BackupEntryStatus = "success" | "failed";

// -----------------------------------------------------------
// Dashboard
// -----------------------------------------------------------
export interface DashboardDTO {
  session: TodaySessionDTO | null;
  revision: TodayRevisionDTO | null;
  stats: DashboardStatsDTO;
  memoryHealth?: number;
  retentionQuality?: number;
  weeklyProgress: DayProgressDTO[];
  recentActivity: ActivityItemDTO[];
  /** Why today's plan looks the way it does (PRODUCT_REQUIREMENTS Requirement 4). */
  planExplanation: PlanExplanationDTO;
  /** Present only when the user is returning after a break (Requirement 5). */
  welcomeBackMessage: string | null;
  /** Present only when today's plan is unusually heavy (Requirement 7). */
  workloadWarning: string | null;
  /** The user's goal, or `null` when they have not set one. */
  goal: GoalCardDTO | null;
  /** The week just gone. Always present — it describes facts, not a feature. */
  weeklyReview: WeeklyReviewDTO;
}

export interface PlanExplanationDTO {
  headline: string;
  details: string[];
}

export interface TodaySessionDTO {
  id: string;
  status: SessionStatus;
  assignment?: {
    /** Transliterated surah name, or a range like "An-Naba – Al-Fajr". */
    surah?: string;
    /** Arabic surah name, shown alongside the transliteration. */
    surahArabic?: string;
    /** Which of the 30 Juz the assignment starts in. */
    juzNumber?: number;
    startPage?: number;
    endPage?: number;
    target?: string;
    notes?: string;
  };
  progress: {
    current: number;
    total: number;
  };
  estimatedTime?: string;
}

export interface TodayRevisionDTO {
  id: string;
  status: RevisionStatus;
  assignment?: {
    type: RevisionType;
    pages?: string[];
    totalPages?: number;
    /**
     * A surah name or range — set **only** when the assignment's pages
     * are genuinely consecutive.
     *
     * Revision is scheduled by memory priority, not by position in the
     * Mushaf, so an assignment is routinely scattered: 345, 346, 400.
     * Labelling that "Al-Anbiya – Al-Furqan" would name a fifty-page
     * span the user has not been asked to revise.
     */
    surah?: string;
    /** Which of the 30 Juz the assignment starts in. Set only alongside `surah`. */
    juzNumber?: number;
    /** Every Juz the assignment touches, ascending — the honest summary for a scattered set. */
    juzCovered?: number[];
    notes?: string;
  };
  progress: {
    current: number;
    total: number;
  };
  estimatedTime?: string;
}

export interface DashboardStatsDTO {
  memorizedPages: number;
  revisionQueue: number;
  weeklyProgress: number;
  consistency?: number;
}

/**
 * The user's goal, ready to render.
 *
 * `summary` is the one sentence the card shows. It is assembled here
 * rather than in the component so that the wording — the part a user
 * actually reads and believes — sits next to the arithmetic that
 * justifies it.
 */
export interface GoalCardDTO {
  targetPages: number;
  /** Already formatted to the user's date preference. */
  targetDate: string;
  pagesMemorized: number;
  pagesRemaining: number;
  /** `null` when PHOS cannot honestly measure a pace yet. Never rendered as zero. */
  pacePerDay: number | null;
  projectedDate: string | null;
  /** Negative is ahead of the goal, positive is later than it. */
  daysFromGoal: number | null;
  targetReached: boolean;
  summary: string;
  /**
   * A quieter second line, present only where it is genuinely needed —
   * chiefly to say that going faster is not automatically better, so a
   * goal card cannot quietly reverse PHOS's retention-over-speed rule.
   */
  note?: string;
}

/** The week just gone, in the four numbers that describe it honestly. */
export interface WeeklyReviewDTO {
  pagesCompleted: number;
  sessionsCompleted: number;
  recallsRecorded: number;
  /** The Analytics Engine's own word for the trend. Never reworded here. */
  recallTrend: string;
  trendSummary: string;
}

export interface DayProgressDTO {
  day: string;
  completed: boolean;
}

export interface ActivityItemDTO {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  status: ActivityStatus;
}

// -----------------------------------------------------------
// Session
// -----------------------------------------------------------
/**
 * One page in the current assignment, with the identity the recall
 * submission needs.
 *
 * Page *labels* alone were enough while every page was recorded as a
 * blanket success. Flagging individual pages as shaky (the Phase 6
 * recall input model) needs the id the API is keyed on.
 */
export interface StudyPageDTO {
  pageId: string;
  pageNumber: number;
  /** Which of the 30 Juz this page belongs to. */
  juzNumber?: number;
  /**
   * Surahs appearing on this page.
   *
   * Carried because a page number is a poor description of the work on
   * surah-dense pages — twelve pages of Juz 30 hold two or three
   * surahs each, and nobody memorizes "two-thirds of page 602".
   */
  surahs?: { name: string; arabicName: string }[];
}

export interface SessionDTO {
  id: string;
  status: SessionStatus;
  title: string;
  assignment?: {
    surah?: string;
    startPage?: number;
    endPage?: number;
    target?: string;
    notes?: string;
  };
  /** The pages in this assignment, for per-page recall feedback. */
  studyPages: StudyPageDTO[];
  progress: {
    current: number;
    total: number;
  };
  estimatedTime?: string;
  duration?: number;
  timer?: string;
}

// -----------------------------------------------------------
// Revision
// -----------------------------------------------------------
export interface RevisionDTO {
  id: string;
  status: RevisionStatus;
  title: string;
  assignment?: {
    type: RevisionType;
    pages?: string[];
    totalPages?: number;
    /** Transliterated surah name or range covered by this assignment. */
    surah?: string;
    /** Which of the 30 Juz the assignment starts in. */
    juzNumber?: number;
    notes?: string;
  };
  /** The pages in this assignment, for per-page recall feedback. */
  studyPages: StudyPageDTO[];
  progress: {
    current: number;
    total: number;
  };
  estimatedTime?: string;
  duration?: number;
}

// -----------------------------------------------------------
// Analytics
// -----------------------------------------------------------
export interface AnalyticsDTO {
  summary: AnalyticsSummaryDTO;
  progressOverTime: ChartDataDTO[];
  revisionActivity: ChartDataDTO[];
  sessionFrequency: ChartDataDTO[];
  memoryStrengthDistribution: ChartDataDTO[];
  learningTrends: ChartDataDTO[];
  retentionDecay: ChartDataDTO[];
  timeline: TimelineEntryDTO[];
}

export interface AnalyticsSummaryDTO {
  totalMemorized: number;
  revisionCompleted: number;
  consistency?: number;
  completionRate?: number;
  averageSessionTime?: string;
  currentStreak?: number;
}

export interface ChartDataDTO {
  label: string;
  value: number;
  date?: string;
}

export interface TimelineEntryDTO {
  id: string;
  type: ActivityType;
  title: string;
  date: string;
  time: string;
  description?: string;
  status?: ActivityStatus;
}

// -----------------------------------------------------------
// History
// -----------------------------------------------------------
export interface HistoryDTO {
  entries: TimelineEntryDTO[];
  totalCount: number;
}

export interface HistoryFiltersDTO {
  search?: string;
  activityType?: ActivityType | "all";
  status?: ActivityStatus | "all";
  dateFrom?: string;
  dateTo?: string;
}

// -----------------------------------------------------------
// Backup
// -----------------------------------------------------------
export interface BackupStatusDTO {
  status: BackupStatus;
  lastBackup?: string;
  history: BackupEntryDTO[];
}

export interface BackupEntryDTO {
  id: string;
  date: string;
  type: BackupEntryType;
  size: string;
  status: BackupEntryStatus;
}

// -----------------------------------------------------------
// Settings
// -----------------------------------------------------------
export interface SettingsDTO {
  general: GeneralSettingsDTO;
  appearance: AppearanceSettingsDTO;
  session: SessionSettingsDTO;
  revision: RevisionSettingsDTO;
}

export interface GeneralSettingsDTO {
  language: string;
  dateFormat: string;
  timeFormat: string;
}

export interface AppearanceSettingsDTO {
  theme: Theme;
  reducedMotion: boolean;
  compactMode: boolean;
}

export interface SessionSettingsDTO {
  showTimer: boolean;
  showProgress: boolean;
  confirmCompletion: boolean;
}

/**
 * Note: an `autoAdvance` preference ("automatically move to the next
 * page after marking complete") was removed in Phase 3. Neither Session
 * nor Revision marks pages one at a time — completion records the whole
 * assignment in a single action — so there is no "next page" to advance
 * to and the toggle could never do anything. It belongs back here if
 * per-page stepping is ever built.
 */
export interface RevisionSettingsDTO {
  showProgress: boolean;
}

// -----------------------------------------------------------
// Exams (Phase 11)
// -----------------------------------------------------------

/** One rung of the exam ladder, as the roadmap draws it. */
export interface ExamStageCardDTO {
  stage: number;
  label: string;
  state: ExamStageState;
  pagesMemorized: number;
  pagesInScope: number;
  examId: string | null;
  /** Already formatted to the user's date preference. */
  examDate: string | null;
  /**
   * Why the stage is in this state, in one line.
   *
   * A locked stage that does not say *why* reads as PHOS withholding
   * something; this always names the pages still to memorize.
   */
  detail: string;
}

export interface ExamCardDTO {
  id: string;
  stage: number | null;
  scopeLabel: string;
  /** Already formatted; `null` when a past exam was recorded without a date. */
  examDate: string | null;
  /** True when this records something passed before PHOS was involved. */
  recordedAsPast: boolean;
  includeNewMemorization: boolean;
  status: ExamStatus;
}

export interface ExamCoverageDayCardDTO {
  date: string;
  pageNumbers: readonly number[];
}

/** The exam currently being prepared for, and how the run-up divides. */
export interface ExamRunUpDTO {
  exam: ExamCardDTO;
  /** Whole days until the exam. Zero means today. */
  daysRemaining: number;
  pagesInScope: number;
  pagesPerDay: number;
  todaysPages: readonly number[];
  /** "Pages 582–589", or "Nothing left to cover". */
  todaysRange: string;
  summary: string;
  /**
   * Present only when the run-up needs more time than the user has.
   * A warning, never a trim — see `calculateExamPlan()`.
   */
  budgetWarning: string | null;
  coverage: readonly ExamCoverageDayCardDTO[];
  /** Says plainly that ordinary revision is paused, so its absence is not read as a fault. */
  setAsideNote: string;
}

export interface ExamAftermathCardDTO {
  pagesFallenBehind: number;
  weakestPageNumbers: readonly number[];
  summary: string;
}

export interface ExamOverviewDTO {
  stages: readonly ExamStageCardDTO[];
  runUp: ExamRunUpDTO | null;
  past: readonly ExamCardDTO[];
  /** What fell behind during a recently passed exam, when there is anything to report. */
  aftermath: ExamAftermathCardDTO | null;
}
