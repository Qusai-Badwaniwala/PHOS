"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getGoalPosition,
  saveGoal,
  type GoalMilestone,
  type GoalPosition,
} from "@/lib/api/settings";
import { useSettings } from "@/providers/settings-provider";
import { TOTAL_MUSHAF_PAGES } from "@/shared/constants";
import { Target } from "lucide-react";

interface GoalSettingsProps {
  className?: string;
}

/** Tomorrow, as `yyyy-mm-dd`, for the date input's floor. */
function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** How many Juz to name in full before the list is abbreviated. */
const MAX_JUZ_LISTED = 8;

/**
 * The Juz a milestone covers, written out — "Juz 30, 1, 2, 3, 4, 5".
 *
 * Long orders are abbreviated at both ends rather than truncated at
 * one, because the last Juz named is the one the user just chose and
 * the first is where their order starts. Dropping either would make the
 * line answer a different question than it was asked.
 */
function describeJuzCovered(milestones: readonly GoalMilestone[]): string {
  const juz = milestones.map((milestone) => milestone.juzNumber);
  if (juz.length <= MAX_JUZ_LISTED) return `Juz ${juz.join(", ")}`;
  return `Juz ${juz.slice(0, 3).join(", ")} … ${juz.slice(-2).join(", ")}`;
}

function milestoneLabel(milestone: GoalMilestone): string {
  const whole = milestone.cumulativePages === TOTAL_MUSHAF_PAGES ? ", the whole Mushaf" : "";
  const done = milestone.reached ? " · already memorized" : "";
  return `Juz ${milestone.juzNumber} — ${milestone.cumulativePages} pages${whole}${done}`;
}

/**
 * Where the user states their own goal.
 *
 * Optional, and framed that way. PHOS works exactly as well without
 * one, and a great many people memorize without ever naming a finish
 * date — the copy says so rather than implying an empty field is
 * something left undone.
 *
 * The target is chosen as a Juz, not a page count. A goal is *stored*
 * in pages because that is what the projection does arithmetic with,
 * but nobody plans their Hifz in pages, and "through Juz 5" only means
 * something along the user's own order: it is 124 pages for somebody
 * memorizing Juz 30 first and 101 for somebody going straight through.
 * The Juz covered are spelled out under the picker so the conversion is
 * visible rather than something PHOS does behind the user's back.
 */
export function GoalSettings({ className }: GoalSettingsProps) {
  const { settings, reload } = useSettings();
  const existing = settings.goal;

  const [position, setPosition] = React.useState<GoalPosition | null>(null);
  const [selected, setSelected] = React.useState("");
  const [targetDate, setTargetDate] = React.useState(
    existing?.targetDate ? existing.targetDate.slice(0, 10) : "",
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  /*
   * Loaded once, on mount. `existing` is read here rather than listed
   * as a dependency: re-running this after every save would overwrite
   * whatever the user had just picked. (The Danger Zone dialog shipped
   * with exactly that bug — an effect that re-ran on every render and
   * stole focus mid-keystroke.)
   */
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await getGoalPosition();
        if (cancelled) return;
        setPosition(loaded);
        const match = loaded.milestones.find(
          (milestone) => milestone.cumulativePages === existing?.targetPages,
        );
        if (match) setSelected(String(match.position));
      } catch {
        if (!cancelled) setError("Could not load your memorization order.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const milestones = position?.milestones ?? [];
  const chosen = milestones.find((milestone) => String(milestone.position) === selected) ?? null;
  const covered = chosen ? milestones.slice(0, chosen.position) : [];

  /*
   * A goal set before this picker existed, or by an older version, can
   * hold a page count that is not a whole Juz. Saying so is better than
   * quietly snapping it to the nearest Juz, which would change the
   * user's goal without being asked.
   */
  const unmatchedGoal = existing && position && !chosen ? existing.targetPages : null;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setPending(true);
    setError(null);
    setOutcome(null);
    try {
      await action();
      await reload();
      setOutcome(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your goal.");
    } finally {
      setPending(false);
    }
  };

  return (
    <SettingsSection
      id="goal"
      title="Goal"
      description="Optional. Name a target and PHOS will tell you where your real pace is heading."
      className={cn(className)}
    >
      <div className="space-y-5">
        {position && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {position.currentJuz === null
              ? `You have memorized all ${TOTAL_MUSHAF_PAGES} pages.`
              : `You're on Juz ${position.currentJuz} · ${position.pagesMemorized} of ${TOTAL_MUSHAF_PAGES} pages memorized.`}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="goal-juz" className="text-sm font-medium">
            I want to have memorized through
          </label>
          <select
            id="goal-juz"
            value={selected}
            disabled={pending || position === null}
            onChange={(event) => setSelected(event.target.value)}
            aria-label="I want to have memorized through"
            /*
              `min-w-0` is load-bearing, not decoration.

              A native `<select>`'s intrinsic minimum width is the width
              of its widest option, and the widest here is "Juz 1 — 21
              pages · already memorized" at roughly 345px. `w-full`
              cannot shrink it below that on its own, so at a 320px
              viewport this one control forced the whole Settings page
              83px wider than the screen and the entire page scrolled
              sideways — 167 elements pushed past the viewport by a
              dropdown.

              `min-w-0` lets it shrink; `truncate` keeps the collapsed
              label readable rather than clipped mid-word. The options
              themselves are unaffected: the browser renders the open
              list at its own width, so nothing becomes unreadable at
              the moment of choosing.
            */
            className="flex h-10 w-full min-w-0 items-center justify-between truncate rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{position === null ? "Loading your order…" : "Choose a Juz"}</option>
            {milestones.map((milestone) => (
              <option key={milestone.position} value={String(milestone.position)}>
                {milestoneLabel(milestone)}
              </option>
            ))}
          </select>

          {/*
            The conversion, shown rather than hidden: which Juz this
            covers along the user's own order, and the page count the
            goal will actually store.
          */}
          {chosen && (
            <p className="text-xs text-muted-foreground">
              {describeJuzCovered(covered)} — {chosen.cumulativePages} pages
            </p>
          )}

          {unmatchedGoal !== null && (
            <p className="text-xs text-muted-foreground">
              Your current goal is {unmatchedGoal} pages, which is not a whole Juz. Choosing a Juz
              above will replace it.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="goal-date" className="text-sm font-medium">
            By when
          </label>
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            min={tomorrowIso()}
            disabled={pending}
            onChange={(event) => setTargetDate(event.target.value)}
            aria-label="Goal date"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending || !targetDate || !chosen}
            onClick={() =>
              void run(
                () =>
                  saveGoal({
                    targetPages: chosen!.cumulativePages,
                    targetDate: new Date(targetDate).toISOString(),
                  }),
                "Goal saved.",
              )
            }
          >
            <Target className="mr-2 h-4 w-4" aria-hidden="true" />
            {existing ? "Update goal" : "Set goal"}
          </Button>

          {existing && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(async () => {
                  await saveGoal(null);
                  setTargetDate("");
                  setSelected("");
                }, "Goal removed.")
              }
            >
              Remove goal
            </Button>
          )}
        </div>

        {/*
          A goal is never required and removing one is never a loss —
          said plainly, so an empty field does not read as something the
          user has failed to finish.
        */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          PHOS schedules the same way with or without a goal. It only changes what the Dashboard
          tells you about your pace, and you can remove it at any time.
        </p>

        {outcome && (
          <p role="status" className="text-sm text-muted-foreground">
            {outcome}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
