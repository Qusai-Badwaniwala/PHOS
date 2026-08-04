"use client";

import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartContainer } from "@/components/analytics/chart-container";
import { DateRangeSelector, type DateRange } from "@/components/analytics/date-range-selector";
import { TimelineCard } from "@/components/analytics/timeline-card";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";
import { AnalyticsError } from "@/components/analytics/analytics-error";
import { AnalyticsEmpty } from "@/components/analytics/analytics-empty";
import { SimpleBarChart } from "@/components/shared/simple-bar-chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnalytics } from "@/lib/hooks/use-analytics";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>("week");
  const { data, loading, error, refetch } = useAnalytics(dateRange);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <AnalyticsError onRetry={refetch} />;
  if (!data) return <AnalyticsEmpty />;

  const hasData = data.summary.totalMemorized > 0 || data.progressOverTime.length > 0;

  if (!hasData) return <AnalyticsEmpty />;

  return (
    <PageContent>
      <PageHeader
        title="Analytics"
        description="Understand your memorization health and long-term trends."
      />

      <DateRangeSelector value={dateRange} onChange={setDateRange} />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Memorized"
              value={data.summary.totalMemorized}
              description="Pages committed to memory"
            />
            <StatCard
              title="Revision Completed"
              value={data.summary.revisionCompleted}
              description="Total revision sessions"
            />
            <StatCard
              title="Consistency"
              value={data.summary.consistency ? `${data.summary.consistency}%` : "—"}
              description={data.summary.consistency ? undefined : "Not enough data yet"}
            />
            <StatCard
              title="Avg. Session"
              value={data.summary.averageSessionTime || "—"}
              description="Average session duration"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartContainer
              title="Progress Over Time"
              description="Memorization growth across selected period"
            >
              <SimpleBarChart data={data.progressOverTime} />
            </ChartContainer>

            <ChartContainer title="Revision Activity" description="Revision frequency and coverage">
              <SimpleBarChart data={data.revisionActivity} />
            </ChartContainer>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartContainer
              title="Session Frequency"
              description="How often you engage with memorization"
            >
              <SimpleBarChart data={data.sessionFrequency} />
            </ChartContainer>

            <ChartContainer
              title="Memory Strength Distribution"
              description="How well your pages are retained"
            >
              <SimpleBarChart data={data.memoryStrengthDistribution} />
            </ChartContainer>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <ChartContainer
            title="Learning Trends"
            description="Long-term patterns in your memorization journey"
          >
            <SimpleBarChart data={data.learningTrends} />
          </ChartContainer>

          <ChartContainer
            title="Retention Decay"
            description="How memory strength changes over time"
          >
            <SimpleBarChart data={data.retentionDecay} />
          </ChartContainer>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <TimelineCard entries={data.timeline} />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
