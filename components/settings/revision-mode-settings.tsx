"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { getRevisionCycle, restartRevisionCycle, saveRevisionMode } from "@/lib/api/settings";
import { useSettings } from "@/providers/settings-provider";
import {
  DEFAULT_CYCLE_LENGTH_DAYS,
  MAXIMUM_CYCLE_LENGTH_DAYS,
  MINIMUM_CYCLE_LENGTH_DAYS,
} from "@/shared/constants";
import { RevisionMode } from "@/shared/types";
import type { RevisionCyclePlan } from "@/shared/types";
import { RotateCcw } from "lucide-react";

interface RevisionModeSettingsProps {
  className?: string;
}

/**
 * How the user wants revision chosen.
 *
 * WHY BOTH OPTIONS ARE PRESENTED AS LEGITIMATE
 * --------------------------------------------
 * PHOS's own scheduling really is better at what it optimises, and the
 * copy says so — hiding that would be false modesty about the entire
 * point of the application. But a fixed rotation is what most Hifz
 * institutions teach, and a student whose teacher sets a Manzil cycle
 * needs to follow it rather than argue with their app. Requirement 9
 * settles it: PHOS recommends, the user decides. So the recommendation
 * is stated plainly once, and then the choice is left alone — no
 * warning triangle, no "are you sure", no nudge on every visit.
 */
export function RevisionModeSettings({ className }: RevisionModeSettingsProps) {
  const { settings, reload } = useSettings();
  const stored = settings.revisionSchedule;

  const [cycleLength, setCycleLength] = React.useState(
    stored?.cycleLengthDays ?? DEFAULT_CYCLE_LENGTH_DAYS,
  );
  const [cycle, setCycle] = React.useState<RevisionCyclePlan | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<string | null>(null);

  const isTraditional = stored?.mode === RevisionMode.Traditional;

  // Where the rotation has reached, shown only when one is running.
  // Loaded on mount and after every change, because the day of the
  // cycle moves when the length does.
  const loadCycle = React.useCallback(async () => {
    try {
      setCycle(await getRevisionCycle());
    } catch {
      setCycle(null);
    }
  }, []);

  React.useEffect(() => {
    void loadCycle();
  }, [loadCycle, isTraditional]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setPending(true);
    setError(null);
    setOutcome(null);
    try {
      await action();
      await reload();
      await loadCycle();
      setOutcome(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setPending(false);
    }
  };

  return (
    <SettingsSection
      id="revision-mode"
      title="How revision is chosen"
      description="PHOS can decide what to revise each day, or follow a fixed cycle you set."
      className={cn(className)}
    >
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="sr-only">Revision scheduling</legend>

          <label className="border-border flex gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="revision-mode"
              className="mt-1"
              checked={!isTraditional}
              disabled={pending}
              onChange={() =>
                void run(
                  () => saveRevisionMode({ mode: RevisionMode.Adaptive }),
                  "PHOS will choose your revision.",
                )
              }
            />
            <span>
              <span className="font-medium">PHOS decides (recommended)</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                Revises whatever is closest to being forgotten. Fewer pages a day for the same
                retention, because the effort follows what your recall actually shows.
              </span>
            </span>
          </label>

          <label className="border-border flex gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="revision-mode"
              className="mt-1"
              checked={isTraditional}
              disabled={pending}
              onChange={() =>
                void run(
                  () =>
                    saveRevisionMode({
                      mode: RevisionMode.Traditional,
                      cycleLengthDays: cycleLength,
                    }),
                  "Your cycle has started from today.",
                )
              }
            />
            <span>
              <span className="font-medium">A fixed cycle</span>
              <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                Rotates through everything you have memorized, in your own order, on a repeating
                schedule — the way most Hifz institutions teach. Choose this if your teacher sets a
                cycle, or if a predictable daily portion suits you better.
              </span>
            </span>
          </label>
        </fieldset>

        {isTraditional && (
          <div className="border-border space-y-4 border-l-2 pl-4">
            <div className="space-y-2">
              <label htmlFor="cycle-length" className="text-sm font-medium">
                Days for a full pass
              </label>
              <NumberStepper
                id="cycle-length"
                value={cycleLength}
                onChange={setCycleLength}
                min={MINIMUM_CYCLE_LENGTH_DAYS}
                max={MAXIMUM_CYCLE_LENGTH_DAYS}
                step={1}
                suffix="days"
                disabled={pending}
                aria-label="Days for a full pass"
              />
              {cycleLength !== stored?.cycleLengthDays && (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    void run(
                      () =>
                        saveRevisionMode({
                          mode: RevisionMode.Traditional,
                          cycleLengthDays: cycleLength,
                        }),
                      "Cycle length updated.",
                    )
                  }
                >
                  Save cycle length
                </Button>
              )}
            </div>

            {cycle && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  Day {cycle.dayOfCycle} of {cycle.cycleLengthDays}
                </p>
                <p className="text-muted-foreground text-xs">
                  {cycle.pagesInCycle} pages memorized, about {cycle.pagesPerDay} a day.
                  {cycle.passesCompleted > 0 &&
                    ` ${cycle.passesCompleted} scheduled ${cycle.passesCompleted === 1 ? "cycle" : "cycles"} elapsed.`}
                </p>

                {/*
                  Unlike an exam's warning, this one is actionable: the
                  cycle length is the user's own choice, so PHOS names a
                  number that would fit rather than only reporting the
                  problem.
                */}
                {cycle.exceedsDailyBudget && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    That is roughly {cycle.estimatedMinutesPerDay} minutes a day, more than the time
                    you set aside.
                    {cycle.suggestedCycleLengthDays
                      ? ` A ${cycle.suggestedCycleLengthDays}-day cycle would fit.`
                      : ""}{" "}
                    PHOS will schedule it either way — it is your cycle.
                  </p>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void run(restartRevisionCycle, "Cycle restarted from today.")}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Start the cycle again
            </Button>
          </div>
        )}

        {/*
          Said once, plainly, and not repeated as a nag. New
          memorization is the thing users most fear a "revision cycle"
          will silently switch off.
        */}
        <p className="text-muted-foreground text-xs leading-relaxed">
          Either way, new memorization is unaffected — PHOS keeps pacing it from what your recall
          shows. This changes only how revision is chosen. An exam, while one is scheduled, takes
          precedence over both.
        </p>

        {outcome && (
          <p role="status" className="text-muted-foreground text-sm">
            {outcome}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
