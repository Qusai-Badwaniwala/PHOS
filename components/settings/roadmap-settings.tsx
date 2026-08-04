"use client";

import React from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsItem } from "@/components/settings/settings-item";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoadmap, updateRoadmap, type RoadmapView } from "@/lib/api/settings";
import { Loader2, Pause, Play } from "lucide-react";

const ORDER_LABELS: Record<string, string> = {
  Standard: "Juz 1 → 30",
  Reverse: "Juz 30 → 1",
  Juz30First: "Juz 30 first, then 1 → 29",
  Custom: "Custom order",
};

/**
 * Lets the user choose how PHOS works through the Mushaf, and pause Juz
 * they are setting aside (PRODUCT_REQUIREMENTS Requirement 2).
 *
 * The copy is explicit that this only affects *future* scheduling,
 * because that is the guarantee the requirement makes and the one a
 * user will worry about before touching these controls.
 */
export function RoadmapSettings() {
  const [roadmap, setRoadmap] = React.useState<RoadmapView | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getRoadmap()
      .then(setRoadmap)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load the roadmap."),
      );
  }, []);

  const apply = async (update: Parameters<typeof updateRoadmap>[0]) => {
    setPending(true);
    setError(null);
    try {
      setRoadmap(await updateRoadmap(update));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the roadmap.");
    } finally {
      setPending(false);
    }
  };

  return (
    <SettingsSection
      id="roadmap-section"
      title="Memorization Roadmap"
      description="The order PHOS works through the Mushaf. Changing this only affects what is scheduled next — pages you have already memorized stay memorized."
    >
      <SettingsItem label="Order" description="Where new memorization is drawn from next.">
        <Select
          value={roadmap?.order ?? ""}
          onValueChange={(order) => void apply({ order })}
          disabled={pending || roadmap === null}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ORDER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsItem>

      {roadmap && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Paused Juz</p>
            <p className="text-xs text-muted-foreground">
              A paused Juz is skipped when choosing new pages to memorize. Revision of its pages
              continues as normal, and nothing you have learned is lost.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roadmap.entries.map((entry) => (
              <Button
                key={entry.juzNumber}
                type="button"
                size="sm"
                variant={entry.paused ? "secondary" : "outline"}
                disabled={pending}
                aria-pressed={entry.paused}
                aria-label={`${entry.paused ? "Resume" : "Pause"} Juz ${entry.juzNumber}`}
                className="h-8 w-14 px-0 tabular-nums"
                onClick={() => void apply({ juzNumber: entry.juzNumber, paused: !entry.paused })}
              >
                {entry.paused ? (
                  <Pause className="mr-1 h-3 w-3" />
                ) : (
                  <Play className="mr-1 h-3 w-3 opacity-40" />
                )}
                {entry.juzNumber}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {roadmap.pausedJuz.length === 0
              ? "No Juz are paused. New memorization follows the order above."
              : `Paused: Juz ${roadmap.pausedJuz.join(", ")}.`}
          </p>

          {roadmap.juzSequence.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Next up:{" "}
              <span className="font-medium text-foreground">
                Juz {roadmap.juzSequence.slice(0, 5).join(" → ")}
                {roadmap.juzSequence.length > 5 ? " → …" : ""}
              </span>
            </p>
          )}
        </div>
      )}

      {pending && (
        <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </SettingsSection>
  );
}
