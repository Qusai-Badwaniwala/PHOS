"use client";

import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { HistoryTable } from "@/components/history/history-table";
import {
  HistoryFilters,
  type ActivityFilter,
  type StatusFilter,
} from "@/components/history/history-filters";
import { HistorySearch } from "@/components/history/history-search";
import { HistoryDrawer } from "@/components/history/history-drawer";
import { HistorySkeleton } from "@/components/history/history-skeleton";
import { HistoryError } from "@/components/history/history-error";
import { HistoryEmpty } from "@/components/history/history-empty";
import { useHistory } from "@/lib/hooks/use-history";
import type { HistoryTimelineEntry } from "@/components/history/history-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function HistoryPage() {
  const [search, setSearch] = React.useState("");
  const [activityType, setActivityType] = React.useState<ActivityFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [selectedEntry, setSelectedEntry] = React.useState<HistoryTimelineEntry | null>(null);

  // Memoized: without this, a new object literal was passed to
  // useHistory() on every render, which changed its internal
  // useCallback's identity every render, which retriggered its
  // useEffect every render — an infinite request loop against
  // /api/v1/analytics/history (Bug #1).
  const filters = React.useMemo(
    () => ({
      search: search || undefined,
      activityType: activityType === "all" ? undefined : activityType,
      status: status === "all" ? undefined : status,
    }),
    [search, activityType, status],
  );

  const { data, loading, error, refetch } = useHistory(filters);

  if (loading) return <HistorySkeleton />;
  if (error) return <HistoryError onRetry={refetch} />;
  if (!data || data.entries.length === 0) return <HistoryEmpty />;

  return (
    <PageContent>
      <PageHeader
        title="History"
        description="Reflect on your past sessions and revision activity."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <HistorySearch value={search} onChange={setSearch} className="flex-1" />
        <HistoryFilters
          activityType={activityType}
          status={status}
          onActivityChange={setActivityType}
          onStatusChange={setStatus}
        />
      </div>

      <Tabs defaultValue="timeline">
        <TabsList className="mb-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <HistoryTimeline entries={data.entries} onSelect={setSelectedEntry} />
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <HistoryTable entries={data.entries} onSelect={setSelectedEntry} />
        </TabsContent>
      </Tabs>

      <HistoryDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </PageContent>
  );
}
