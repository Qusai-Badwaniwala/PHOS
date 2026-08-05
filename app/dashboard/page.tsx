"use client";

import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Separator } from "@/components/ui/separator";
import { InspirationalAyah } from "@/components/dashboard/inspirational-ayah";
import { TodaySessionCard } from "@/components/dashboard/today-session-card";
import { TodayRevisionCard } from "@/components/dashboard/today-revision-card";
import { MemoryHealth } from "@/components/dashboard/memory-health";
import { RetentionQuality } from "@/components/dashboard/retention-quality";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { PlanExplanationCard } from "@/components/dashboard/plan-explanation";
import { WelcomeBack } from "@/components/dashboard/welcome-back";
import { WorkloadNotice } from "@/components/dashboard/workload-notice";
import { LogOutsideWork } from "@/components/dashboard/log-outside-work";
import { GoalCard } from "@/components/dashboard/goal-card";
import { WeeklyReviewCard } from "@/components/dashboard/weekly-review";
import { ExamModeStrip } from "@/components/exams/exam-mode-strip";
import { useDashboard } from "@/lib/hooks/use-dashboard";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError onRetry={refetch} />;
  if (!data) return <DashboardEmpty />;

  return (
    <PageContent>
      {/* Page header — concise, no description needed: TopNav provides context */}
      <PageHeader title="Dashboard" />

      {/* Returning after a break — Requirement 5. Placed above
          everything else so a returning user is greeted before they see
          the work waiting for them. */}
      <WelcomeBack message={data.welcomeBackMessage} />

      {/*
        Exams have their own screen, but exam mode replaces the day's
        plan — ordinary revision disappears and weak pages stop being
        surfaced. That has to be explained where it happens, so one
        strip stays here while a run-up is active and renders nothing
        the rest of the time.
      */}
      <ExamModeStrip />

      {/* Inspirational Ayah — AD-17, always visible */}
      <InspirationalAyah />

      {/*
        PRIMARY FOCUS: Today's Plan
        These two cards are the most important element on the page.
        They sit at the top, full-height, with visual elevation.
      */}
      <section aria-labelledby="todays-plan-heading">
        <h2
          id="todays-plan-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Today&apos;s Plan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TodaySessionCard session={data.session} />
          <TodayRevisionCard revision={data.revision} />
        </div>

        {/* Why the plan looks like this — Requirement 4. Directly
            beneath the plan it explains, so the reasoning is read in
            context rather than as a separate feature. */}
        <PlanExplanationCard explanation={data.planExplanation} className="mt-4" />

        {/* Requirement 7: a heavy day is named, never silently trimmed. */}
        <WorkloadNotice message={data.workloadWarning} className="mt-4" />
      </section>

      {/* Requirement 9: the user is always free to work outside PHOS. */}
      <LogOutsideWork onLogged={refetch} />

      <Separator />

      {/* Overview Statistics */}
      <section aria-label="Overview Statistics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Memorized Pages"
            value={data.stats.memorizedPages}
            description="Total pages committed to memory"
          />
          <StatCard
            title="Revision Queue"
            value={data.stats.revisionQueue}
            description="Pages scheduled for today"
          />
          <StatCard
            title="Weekly Progress"
            value={`${data.stats.weeklyProgress}%`}
            trend="neutral"
          />
          <StatCard
            title="Consistency"
            value={data.stats.consistency ? `${data.stats.consistency}%` : "—"}
            description={data.stats.consistency ? undefined : "Not enough data yet"}
            trend={data.stats.consistency ? "up" : undefined}
          />
        </div>
      </section>

      <Separator />

      {/* Memory Health & Retention Quality */}
      <section aria-label="Memory Analysis" className="grid gap-4 lg:grid-cols-2">
        <MemoryHealth score={data.memoryHealth} />
        <RetentionQuality score={data.retentionQuality} />
      </section>

      {/* Weekly Progress Chart */}
      <WeeklyProgress days={data.weeklyProgress} />

      {/*
        Looking back rather than forward — the goal the user set, and
        the week they actually had. Placed below today's plan on
        purpose: what to do now is the point of this screen, and
        progress tracking must never be the first thing competing for
        attention.
      */}
      <section aria-label="Progress over time" className="grid gap-4 lg:grid-cols-2">
        <GoalCard goal={data.goal} />
        <WeeklyReviewCard review={data.weeklyReview} />
      </section>

      {/* Recent Activity */}
      <RecentActivity activities={data.recentActivity} />
    </PageContent>
  );
}
