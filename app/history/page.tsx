"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HistoryTable } from "@/components/history/history-table";
import { HistoryDrawer } from "@/components/history/history-drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useHistory } from "@/lib/hooks/use-history";
import type { ActivityType, ActivityStatus, TimelineEntryDTO } from "@/types/dto";
export default function HistoryPage() {
  const [search, setSearch] = React.useState("");
  const [activityType, setActivity] = React.useState<ActivityType | "all">("all");
  const [status, setStatus] = React.useState<ActivityStatus | "all">("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selected, setSelected] = React.useState<TimelineEntryDTO | null>(null);
  const openedRecord = React.useRef<string | null>(null);
  const filters = React.useMemo(
    () => ({ search, activityType, status, dateFrom: from || undefined, dateTo: to || undefined }),
    [search, activityType, status, from, to],
  );
  const { data, loading, error, refetch } = useHistory(filters);
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("record");
    if (id && data && openedRecord.current !== id) {
      const entry = data.entries.find((entry) => entry.id === id);
      if (entry) {
        openedRecord.current = id;
        setSelected(entry);
      }
    }
  }, [data]);
  const reset = () => {
    setSearch("");
    setActivity("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };
  const filtered = search || activityType !== "all" || status !== "all" || from || to;
  return (
    <PageContent>
      <PageHeader
        title="Your study record"
        description="A record of the portions you returned to, and the pages you learned."
      />
      <div className="flex min-h-11 items-center gap-5 border-b pb-2 text-sm">
        <Link href="/analytics" className="text-muted-foreground">
          My Hifz overview
        </Link>
        <span className="text-primary">History</span>
      </div>
      <section aria-label="Filter history" className="space-y-4">
        <div className="relative">
          <Search size={17} className="text-muted-foreground absolute top-3.5 left-3" />
          <Input
            type="search"
            aria-label="Search history"
            placeholder="Search by study or page…"
            className="h-12 pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-muted-foreground space-y-1 text-xs">
            <span>Study</span>
            <select
              className="border-input bg-background text-foreground h-12 w-full rounded-lg border px-3"
              value={activityType}
              onChange={(e) => setActivity(e.target.value as ActivityType | "all")}
            >
              <option value="all">All study</option>
              <option value="session">Sabaq</option>
              <option value="revision">Revision</option>
            </select>
          </label>
          <label className="text-muted-foreground space-y-1 text-xs">
            <span>Status</span>
            <select
              className="border-input bg-background text-foreground h-12 w-full rounded-lg border px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus | "all")}
            >
              <option value="all">All records</option>
              <option value="completed">Closed</option>
              <option value="pending">In progress</option>
            </select>
          </label>
          <label className="text-muted-foreground space-y-1 text-xs">
            <span>From</span>
            <Input
              type="date"
              className="h-12"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-muted-foreground space-y-1 text-xs">
            <span>Through</span>
            <Input
              type="date"
              className="h-12"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X size={15} className="mr-2" />
            Clear filters
          </Button>
        )}
      </section>
      {error ? (
        <div role="alert">
          <p className="text-destructive mb-3">{error.message}</p>
          <Button variant="outline" onClick={refetch}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <p role="status" className="text-muted-foreground py-8 text-sm">
          Reading your record…
        </p>
      ) : !data?.entries.length ? (
        <section className="border-y py-10">
          <h2 className="text-lg font-semibold">
            {filtered ? "No matching records" : "Your record begins with your first study"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {filtered
              ? "Try another page, date or study type. Your filters are still here."
              : "Completed and open study sessions will appear here, with the pages they covered."}
          </p>
          {filtered ? (
            <Button variant="outline" className="mt-5" onClick={reset}>
              Clear filters
            </Button>
          ) : (
            <Button asChild className="mt-5">
              <Link href="/dashboard">
                Open Today
                <ArrowRight size={17} className="ml-2" />
              </Link>
            </Button>
          )}
        </section>
      ) : (
        <Tabs defaultValue="timeline">
          <div className="mb-4 flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <span className="text-muted-foreground text-xs">{data.entries.length} records</span>
          </div>
          <TabsContent value="timeline">
            {data.entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelected(entry)}
                className="folio-row w-full text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs">
                    {entry.date} · {entry.time}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">{entry.title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
                </div>
                <ArrowRight size={18} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </TabsContent>
          <TabsContent value="table">
            <HistoryTable entries={data.entries} onSelect={setSelected} />
          </TabsContent>
        </Tabs>
      )}
      <HistoryDrawer entry={selected} onClose={() => setSelected(null)} />
    </PageContent>
  );
}
