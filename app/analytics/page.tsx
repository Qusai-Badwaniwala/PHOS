"use client";
import React from "react";
import Link from "next/link";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleBarChart } from "@/components/shared/simple-bar-chart";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { AnalyticsError } from "@/components/analytics/analytics-error";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics } from "@/lib/hooks/use-analytics";
export default function AnalyticsPage() {
  const [range, setRange] = React.useState<DateRange>("week");
  const { data, loading, error, refetch } = useAnalytics(range);
  if (error) return <AnalyticsError onRetry={refetch} />;
  return (
    <PageContent>
      <PageHeader
        title="My Hifz"
        description="What you have learned, and how it is staying with you."
      />
      <Tabs defaultValue="overview">
        <div className="mb-7 flex items-center justify-between border-b">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          <Link
            href="/history"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center px-3 text-sm"
          >
            History
          </Link>
        </div>
        <DateRangeSelector value={range} onChange={setRange} />
        {loading || !data ? (
          <AnalyticsSkeleton />
        ) : (
          <>
            <TabsContent value="overview" className="space-y-8 pt-6">
              <section className="grid gap-6 border-b pb-7 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-3">Held in memory · all time</p>
                  <p className="folio-title text-5xl tabular-nums">
                    {data.summary.totalMemorized}
                    <span className="text-muted-foreground ml-3 text-base">of 604 pages</span>
                  </p>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                    All memorized pages remain part of revision, including those PHOS calls
                    mastered.
                  </p>
                </div>
                <dl className="divide-y">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-muted-foreground text-sm">
                      Revision sessions · selected period
                    </dt>
                    <dd className="font-semibold tabular-nums">{data.summary.revisionCompleted}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-muted-foreground text-sm">Average elapsed session</dt>
                    <dd className="tabular-nums">{data.summary.averageSessionTime ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-muted-foreground text-sm">Sessions closed</dt>
                    <dd className="tabular-nums">
                      {data.summary.completionRate === undefined
                        ? "—"
                        : `${data.summary.completionRate}%`}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="grid gap-8 md:grid-cols-2">
                <div>
                  <h2 className="mb-1 text-lg font-semibold">New pages learned</h2>
                  <p className="text-muted-foreground mb-5 text-sm">
                    Sabaq pages recorded each day.
                  </p>
                  <SimpleBarChart data={data.progressOverTime} />
                </div>
                <div>
                  <h2 className="mb-1 text-lg font-semibold">Pages revisited</h2>
                  <p className="text-muted-foreground mb-5 text-sm">
                    Sabaqi, Manzil and recovery pages each day.
                  </p>
                  <SimpleBarChart data={data.revisionActivity} />
                </div>
              </section>
              <section className="folio-section">
                <h2 className="text-lg font-semibold">Where your pages stand</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Memory states describe current recall. They can move in either direction.
                </p>
                <dl className="mt-5 divide-y">
                  {data.memoryStrengthDistribution.map((state) => (
                    <div
                      key={state.label}
                      className="grid grid-cols-[100px_1fr_40px] items-center gap-4 py-3 text-sm"
                    >
                      <dt>{state.label === "Unseen" ? "Not yet studied" : state.label}</dt>
                      <div className="bg-muted h-1.5">
                        <div
                          className="bg-primary/75 h-full"
                          style={{ width: `${(state.value / 604) * 100}%` }}
                        />
                      </div>
                      <dd className="text-right tabular-nums">{state.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </TabsContent>
            <TabsContent value="trends" className="space-y-8 pt-6">
              <section className="grid gap-6 border-b pb-7 sm:grid-cols-2">
                {[
                  {
                    title: "Memory health",
                    value: data.memoryHealth,
                    detail: "The engine’s current estimate of strength and stability.",
                  },
                  {
                    title: "Retention quality",
                    value: data.retentionQuality,
                    detail: "Successful recall in the observed record.",
                  },
                ].map((metric) => (
                  <div key={metric.title}>
                    <h2 className="eyebrow">{metric.title}</h2>
                    <p className="folio-title my-3 text-4xl tabular-nums">
                      {metric.value === undefined ? "—" : `${Math.round(metric.value)}%`}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {metric.value === undefined
                        ? "PHOS needs real recall before it can assess this."
                        : metric.detail}
                    </p>
                  </div>
                ))}
              </section>
              <div>
                <h2 className="mb-1 text-lg font-semibold">Recall success</h2>
                <p className="text-muted-foreground mb-5 text-sm">
                  The percentage of reported successful recalls each day. This is recall evidence,
                  not a prediction of forgetting.
                </p>
                <SimpleBarChart data={data.retentionDecay} />
              </div>
              <section className="folio-section">
                <h2 className="text-lg font-semibold">Recall comparison</h2>
                <p className="text-muted-foreground mt-3">
                  {data.trendSummary ??
                    (range === "year"
                      ? "The yearly view shows this year’s recorded work. Choose a week or month for the engine’s comparison with the preceding period."
                      : "A comparison will appear as your recall record grows.")}
                </p>
                {data.learningTrends.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {data.learningTrends[0]?.label} · {data.learningTrends[0]?.value} percentage
                    points of change
                  </p>
                )}
              </section>
              <div className="folio-section">
                <h2 className="mb-5 text-lg font-semibold">Study sessions</h2>
                <SimpleBarChart data={data.sessionFrequency} />
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageContent>
  );
}
