"use client";
import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Flag, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "./page-header";
import { ConfirmationDialog } from "./confirmation-dialog";
import { getSession, startSession, completeSession, finishSessionLater } from "@/lib/api/session";
import {
  getRevision,
  startRevision,
  completeRevision,
  finishRevisionLater,
} from "@/lib/api/revision";
import {
  getStudyReceipt,
  saveStudyFeedback,
  type CompletionProgress,
  type StudyReceipt,
} from "@/lib/api/activeSession";
import { useSettings } from "@/providers/settings-provider";
import { formatPageList } from "@/lib/format";
import { SessionType } from "@/shared/types";
import type { SessionDTO, RevisionDTO } from "@/types/dto";

export function StudyExperience({ revision = false }: { revision?: boolean }) {
  const { settings } = useSettings();
  const router = useRouter();
  const params = useSearchParams();
  const receiptId = params.get("receipt");
  const kind = params.get("kind");
  const extra = params.get("extra") === "1";
  const sessionType =
    kind === "manzil"
      ? SessionType.Manzil
      : kind === "recovery"
        ? SessionType.Recovery
        : kind === "sabqi"
          ? SessionType.Sabqi
          : undefined;
  const [data, setData] = React.useState<SessionDTO | RevisionDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [receipt, setReceipt] = React.useState<StudyReceipt | null>(null);
  const [weak, setWeak] = React.useState<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<CompletionProgress | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (receiptId) {
        setReceipt(await getStudyReceipt(receiptId));
        return;
      }
      const next = revision ? await getRevision(sessionType) : await getSession(extra);
      setData(next);
      setWeak(new Set(next?.weakPageIds ?? []));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your assignment could not open.");
    } finally {
      setLoading(false);
    }
  }, [receiptId, revision, sessionType, extra]);
  React.useEffect(() => {
    void load();
  }, [load]);
  React.useEffect(() => {
    if (loading) return;
    const heading = document.querySelector<HTMLElement>("main h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [loading, receipt?.sessionId, data?.id]);
  React.useEffect(() => {
    if (!data?.startedAt || receipt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data?.startedAt, receipt]);
  const active = data?.status === "in_progress" || data?.status === "paused";
  const title = revision
    ? data?.assignment && "type" in data.assignment
      ? data.assignment.type === "recovery"
        ? "Recovery"
        : data.assignment.type === "manzil"
          ? "Manzil"
          : "Sabaqi"
      : "Revision"
    : "Sabaq";
  const action = async (run: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await run();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This action could not be saved. Please try again.",
      );
      if (data && !receipt) {
        try {
          const refreshed = revision ? await getRevision(sessionType) : await getSession(extra);
          setData(refreshed);
        } catch {
          /* Keep the save error visible. */
        }
      }
    } finally {
      setPending(false);
    }
  };
  const start = () =>
    action(async () => {
      if (revision) await startRevision(sessionType);
      else await startSession(extra);
      await load();
    });
  const pause = () =>
    action(async () => {
      if (!data) return;
      const paused = data.status !== "paused";
      await saveStudyFeedback(data.id, weak, paused);
      setData({ ...data, status: paused ? "paused" : "in_progress" });
    });
  const toggle = (pageId: string) =>
    action(async () => {
      if (!data) return;
      const next = new Set(weak);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      await saveStudyFeedback(data.id, next, data.status === "paused");
      setWeak(next);
    });
  const saved = (result: StudyReceipt) => {
    setReceipt(result);
    window.scrollTo(0, 0);
    router.replace(
      `${revision ? "/revision" : "/session"}?receipt=${encodeURIComponent(result.sessionId)}`,
      { scroll: false },
    );
  };
  const complete = () =>
    action(async () => {
      setConfirm(false);
      const result = revision
        ? await completeRevision(setProgress, weak)
        : await completeSession(setProgress, weak);
      saved(result);
      setProgress(null);
    });
  const later = () =>
    action(async () => {
      if (!data) return;
      if (revision) await finishRevisionLater();
      else await finishSessionLater();
      saved(await getStudyReceipt(data.id));
    });
  if (loading && !receipt)
    return (
      <div role="status" className="space-y-6 py-8">
        <p className="eyebrow">Your study</p>
        <div className="bg-muted h-8 w-40 animate-pulse rounded" />
        <div className="bg-muted h-48 rounded-xl" />
        <p className="text-muted-foreground text-sm">Opening your assignment…</p>
      </div>
    );
  if (receipt)
    return (
      <div className="tab-panel mx-auto max-w-lg space-y-7 py-8">
        <span className="bg-success-muted text-success inline-flex h-12 w-12 items-center justify-center rounded-full">
          <Check size={23} />
        </span>
        <div>
          <p className="eyebrow mb-3">Saved to your record</p>
          <PageHeader
            title={receipt.pagesCompleted ? "A careful day’s work" : "Ready for another day"}
            description={
              receipt.pagesCompleted
                ? "Your recall is recorded. PHOS will bring these pages back when they need you."
                : "This session is closed. Unstudied pages stay on your plan."
            }
          />
        </div>
        <dl className="divide-y border-y">
          <div className="flex justify-between py-4">
            <dt>Pages recorded</dt>
            <dd className="font-semibold tabular-nums">{receipt.pagesCompleted}</dd>
          </div>
          <div className="flex justify-between py-4">
            <dt>Marked as shaky</dt>
            <dd className="font-semibold tabular-nums">{receipt.weakPages}</dd>
          </div>
          <div className="flex justify-between py-4">
            <dt>Elapsed time</dt>
            <dd className="tabular-nums">
              {Math.floor(receipt.durationSeconds / 60)}m {receipt.durationSeconds % 60}s
            </dd>
          </div>
        </dl>
        <p className="text-muted-foreground text-sm">
          {new Date(receipt.completedAt).toLocaleString()} ·{" "}
          {receipt.sessionType === "Sabqi" ? "Sabaqi" : receipt.sessionType}
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard">
            Return to Today
            <ArrowRight size={18} className="ml-2" />
          </Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/history?record=${encodeURIComponent(receipt.sessionId)}`}>
            View this record
          </Link>
        </Button>
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <PageHeader
          title={revision ? "Nothing needs revision today" : "No new page is recommended today"}
          description={
            revision
              ? "Your memorized pages are still being tracked. They will return according to your revision schedule."
              : "A steady pace leaves room to retain what you have learned."
          }
        />
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <Button asChild>
          <Link href="/dashboard">Return to Today</Link>
        </Button>
        {error && (
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        )}
      </div>
    );
  const elapsed = data.startedAt
    ? Math.max(0, Math.floor((now - Date.parse(data.startedAt)) / 1000))
    : 0;
  const juz = [...new Set(data.studyPages.map((page) => page.juzNumber).filter(Boolean))];
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          {active
            ? data.status === "paused"
              ? "Study paused · saved on this device"
              : "Study in progress"
            : "Your assignment"}
        </p>
        {settings.session.showTimer && active && (
          <time
            aria-label="Elapsed session time"
            className="text-muted-foreground text-sm tabular-nums"
          >
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </time>
        )}
      </div>
      {extra && !active && (
        <p className="border-primary text-muted-foreground border-l-2 pl-4 text-sm">
          Extra Sabaq is your choice beyond the daily recommendation. Keep enough time for revision.
        </p>
      )}
      <PageHeader
        title={title}
        description={
          title === "Sabaq"
            ? "Make this portion familiar, with your physical Mushaf."
            : title === "Recovery"
              ? "Return gently to the pages that need more care."
              : title === "Manzil"
                ? "A return to your established memorization."
                : "Keep your recent memorization close."
        }
      />
      <section className="bg-card rounded-xl border p-6 md:p-8" aria-label="Study assignment">
        <p className="eyebrow mb-3">{juz.length ? `Juz ${juz.join(", ")}` : "Mushaf assignment"}</p>
        <h2 className="folio-title text-[27px] leading-snug">
          {formatPageList(data.studyPages.map((page) => page.pageNumber))}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          {data.studyPages.length} page{data.studyPages.length === 1 ? "" : "s"}
          {data.estimatedTime && data.estimatedTime !== "—" ? ` · about ${data.estimatedTime}` : ""}
        </p>
        <div className="mt-5 divide-y border-t">
          {data.studyPages.map((page) => (
            <div key={page.pageId} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Page {page.pageNumber}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {page.surahs?.map((surah) => surah.name).join(" · ")}
                </p>
              </div>
              {active && (
                <button
                  type="button"
                  aria-pressed={weak.has(page.pageId)}
                  aria-label={`Page ${page.pageNumber}${weak.has(page.pageId) ? ", marked as shaky" : ": mark as shaky"}`}
                  disabled={pending || data.completedPageIds?.includes(page.pageId)}
                  onClick={() => void toggle(page.pageId)}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm ${weak.has(page.pageId) ? "border-warning bg-warning-muted text-warning" : "border-input text-muted-foreground hover:bg-muted"}`}
                >
                  <Flag size={15} />
                  {data.completedPageIds?.includes(page.pageId)
                    ? "Recorded"
                    : weak.has(page.pageId)
                      ? "Shaky"
                      : "Mark"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      {active && (
        <div className="text-muted-foreground text-sm">
          <p>
            Mark only the pages that felt shaky. Unmarked pages will be recorded as recalled well.
          </p>
          <p className="mt-2">
            {weak.size} marked. Your flags and pause state are saved on this device.
          </p>
        </div>
      )}
      {(revision ? settings.revision.showProgress : settings.session.showProgress) && active && (
        <p className="text-muted-foreground text-sm">
          {data.progress.current} of {data.progress.total} pages recorded
        </p>
      )}
      <details className="folio-section">
        <summary className="text-sm font-medium">A note for this study</summary>
        <p className="text-muted-foreground py-2 text-sm">
          Use your Mushaf and follow your teacher’s guidance. PHOS records the page-level recall you
          report; it does not listen to recitation or assess Tajweed. The timer measures elapsed
          time, including pauses.
        </p>
      </details>
      {error && (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-lg border p-4 text-sm"
        >
          {error}
          <p className="mt-2">Previously recorded pages stay saved. Retry to continue from them.</p>
        </div>
      )}
      <div className="study-actions">
        <div className="study-actions-inner">
          {active ? (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void pause()}
                aria-label={data.status === "paused" ? "Resume study" : "Pause study"}
              >
                {data.status === "paused" ? <Play size={17} /> : <Pause size={17} />}
              </Button>
              <Button
                disabled={pending || data.status === "paused"}
                onClick={() =>
                  !revision && settings.session.confirmCompletion
                    ? setConfirm(true)
                    : void complete()
                }
              >
                {pending
                  ? progress
                    ? `Saving ${progress.completed} of ${progress.total}…`
                    : "Saving…"
                  : `Complete ${title.toLowerCase()}`}
              </Button>
            </>
          ) : (
            <Button disabled={pending} onClick={() => void start()}>
              {pending ? "Opening study…" : `Begin ${title.toLowerCase()}`}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          )}
        </div>
        {active && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void later()}
            className="text-muted-foreground mx-auto mt-1 block min-h-11 px-4 text-sm"
          >
            Finish for now · keep recorded work
          </button>
        )}
      </div>
      <ConfirmationDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Complete Session"
        description="This records every unrecorded page in the assignment. Unmarked pages are recalled well; marked pages are shaky."
        confirmLabel="Complete Session"
        onConfirm={complete}
        pending={pending}
      />
    </div>
  );
}
