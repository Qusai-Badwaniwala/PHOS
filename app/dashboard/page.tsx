"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check } from "lucide-react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { InspirationalAyah } from "@/components/dashboard/inspirational-ayah";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { LogOutsideWork } from "@/components/dashboard/log-outside-work";
import { GoalCard } from "@/components/dashboard/goal-card";
import { ExamModeStrip } from "@/components/exams/exam-mode-strip";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { formatPageList } from "@/lib/format";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError onRetry={refetch} />;
  if (!data) return <DashboardEmpty />;
  const revisions = data.revisionAssignments ?? (data.revision ? [data.revision] : []);
  const revision = revisions[0] ?? null;
  const sabaq = data.session;
  const primary = revision
    ? `/revision?kind=${revision.assignment?.type ?? "sabqi"}`
    : sabaq
      ? "/session"
      : null;
  const revisionTitle =
    revision?.assignment?.type === "recovery"
      ? "Recovery"
      : revision?.assignment?.type === "manzil"
        ? "Manzil"
        : "Sabaqi";

  const date = new Date().toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <PageContent>
      <div>
        <p className="eyebrow mb-3">{date}</p>
        <PageHeader
          title="Today’s Hifz"
          description={
            data.stats.memorizedPages === 604
              ? "A careful return to what you know."
              : "A little new. A careful return to what you know."
          }
        />
      </div>
      {data.welcomeBackMessage && (
        <p className="border-primary text-muted-foreground border-l-2 pl-4">
          {data.welcomeBackMessage}
        </p>
      )}
      <ExamModeStrip />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="today-plan"
          className="bg-card rounded-xl border px-5 pt-6 pb-5 md:px-7"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 id="today-plan" className="eyebrow">
              Your work today
            </h2>
            <span className="text-muted-foreground text-xs">
              {data.stats.revisionQueue} revision pages
            </span>
          </div>
          {revisions.map((item, index) => {
            const label =
              item.assignment?.type === "recovery"
                ? "Recovery"
                : item.assignment?.type === "manzil"
                  ? "Manzil"
                  : "Sabaqi";
            return (
              <Link
                key={item.id}
                href={`/revision?kind=${item.assignment?.type ?? "sabqi"}`}
                className="folio-row group"
              >
                <span className="text-muted-foreground text-xs tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold">{label}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {formatPageList(
                      (item.assignment?.pages ?? []).map((page) => Number(page.replace(/\D/g, ""))),
                    )}{" "}
                    · {item.estimatedTime}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {label === "Recovery"
                      ? "A careful return to pages that felt shaky."
                      : label === "Manzil"
                        ? "Keep your established memorization close."
                        : "Strengthen recent memorization."}
                  </p>
                </div>
                <ArrowUpRight size={20} className="text-primary" />
              </Link>
            );
          })}
          {sabaq && (
            <Link href="/session" className="folio-row group">
              <span className="text-muted-foreground text-xs tabular-nums">
                {String(revisions.length + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold">Sabaq</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {sabaq.assignment?.surah || "New memorization"} · {sabaq.estimatedTime}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Juz {sabaq.assignment?.juzNumber} ·{" "}
                  {sabaq.assignment?.startPage === sabaq.assignment?.endPage
                    ? `Page ${sabaq.assignment?.startPage}`
                    : `Pages ${sabaq.assignment?.startPage}–${sabaq.assignment?.endPage}`}
                </p>
              </div>
              <ArrowUpRight size={20} className="text-primary" />
            </Link>
          )}
          {!primary && (
            <div className="py-8">
              <Check size={24} className="text-success mb-3" />
              <h3 className="text-xl font-semibold">A quiet day</h3>
              <p className="text-muted-foreground mt-2">
                No further work is recommended today. Your pages will return when they need
                attention.
              </p>
              {data.stats.memorizedPages < 604 && (
                <Button asChild variant="outline" className="mt-5">
                  <Link href="/session?extra=1">Choose extra Sabaq</Link>
                </Button>
              )}
            </div>
          )}
          {primary && (
            <Button asChild className="mt-5 w-full">
              <Link href={primary}>
                {primary.startsWith("/revision")
                  ? `Begin ${revisionTitle.toLowerCase()}`
                  : "Begin Sabaq"}
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
          )}
          {!sabaq && primary && data.stats.memorizedPages < 604 && (
            <Link
              href="/session?extra=1"
              className="text-muted-foreground mt-2 flex min-h-11 items-center justify-center text-sm"
            >
              Choose extra Sabaq
            </Link>
          )}
          <details className="mt-3">
            <summary className="text-muted-foreground text-sm">Why this plan?</summary>
            <p className="mb-2 text-sm font-medium">{data.planExplanation.headline}</p>
            <ul className="text-muted-foreground space-y-2 pb-3 text-sm">
              {data.planExplanation.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </details>
          {data.workloadWarning && (
            <p role="status" className="text-warning border-t pt-4 text-sm">
              {data.workloadWarning}
            </p>
          )}
        </section>
        <div className="space-y-7">
          <section aria-label="Your Hifz at a glance" className="pt-1">
            <p className="eyebrow mb-3">Held in memory</p>
            <p className="folio-title text-[42px] leading-none tabular-nums">
              {data.stats.memorizedPages}
              <span className="text-muted-foreground ml-2 text-base">of 604 pages</span>
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Memorized pages stay part of your revision. The work is to keep them.
            </p>
            <Link
              href="/analytics"
              className="text-primary mt-3 inline-flex min-h-11 items-center gap-2 text-sm"
            >
              See your Hifz
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="folio-section">
            <h2 className="eyebrow">The last seven days</h2>
            <div className="my-4 flex justify-between gap-2">
              {data.weeklyProgress.map((day, i) => (
                <div key={i} className="text-center">
                  <span
                    className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${day.completed ? "bg-primary text-primary-foreground" : "text-muted-foreground border"}`}
                  >
                    {day.completed ? (
                      <Check size={14} aria-label="Studied" />
                    ) : (
                      <span aria-label="No completed study">·</span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">{day.day}</span>
                </div>
              ))}
            </div>
            <p className="text-sm">
              {data.weeklyReview.pagesCompleted} pages learned ·{" "}
              {data.weeklyReview.sessionsCompleted} sessions
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {data.weeklyReview.recallsRecorded
                ? data.weeklyReview.trendSummary
                : "Your recall history begins with your first study."}
            </p>
          </section>
        </div>
      </div>
      <LogOutsideWork onLogged={refetch} />
      <GoalCard goal={data.goal} />
      <section className="folio-section">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently recorded</h2>
          <Link
            href="/history"
            className="text-primary inline-flex min-h-11 items-center gap-1 text-sm"
          >
            History
            <ArrowRight size={16} />
          </Link>
        </div>
        {data.recentActivity.length ? (
          data.recentActivity.slice(0, 3).map((activity) => (
            <div key={activity.id} className="folio-row justify-between">
              <div>
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-muted-foreground text-sm">{activity.detail}</p>
              </div>
              <span className="text-muted-foreground text-xs">{activity.date}</span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground py-5 text-sm">
            Your first study session will begin this record.
          </p>
        )}
      </section>
      <InspirationalAyah />
    </PageContent>
  );
}
