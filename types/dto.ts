/**
 * PHOS Backend DTOs
 * Shared contracts between Frontend and Backend.
 * These types define exactly what the frontend expects from Claude's implementation.
 * Do not modify without architectural approval.
 */

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
