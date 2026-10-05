"use client";
import React from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { getRoadmap, updateRoadmap, type RoadmapView } from "@/lib/api/settings";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
const ORDERS = [
  ["Standard", "Juz 1 → 30"],
  ["Reverse", "Juz 30 → 1"],
  ["Juz30First", "Juz 30 first, then 1 → 29"],
  ["ExamOrder", "Exam order: Juz 30 → 26, then 1 → 25"],
  ["Custom", "My custom order"],
] as const;
export function RoadmapSettings() {
  const [roadmap, setRoadmap] = React.useState<RoadmapView | null>(null);
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState("");
  const adopt = (result: RoadmapView) => {
    setRoadmap(result);
    setSequence(
      [...result.entries].sort((a, b) => a.position - b.position).map((entry) => entry.juzNumber),
    );
  };
  const load = () =>
    void getRoadmap()
      .then(adopt)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not open your roadmap."),
      );
  React.useEffect(load, []);
  const apply = async (update: Parameters<typeof updateRoadmap>[0]) => {
    setPending(true);
    setError(null);
    setNotice("");
    try {
      adopt(await updateRoadmap(update));
      setNotice("Roadmap saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the roadmap.");
    } finally {
      setPending(false);
    }
  };
  const move = (index: number, delta: number) =>
    setSequence((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      setNotice("");
      return next;
    });
  return (
    <SettingsSection
      id="roadmap"
      title="Your memorization roadmap"
      description="Choose where new pages come from. Your learned pages and their revision stay intact."
    >
      <label htmlFor="roadmap-order" className="mb-2 block font-medium">
        Memorization order
      </label>
      <select
        id="roadmap-order"
        value={roadmap?.order ?? ""}
        disabled={!roadmap || pending}
        onChange={(event) => void apply({ order: event.target.value })}
        className="border-input bg-background min-h-12 w-full rounded-md border px-3"
      >
        <option value="" disabled>
          Loading…
        </option>
        {ORDERS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {roadmap && (
        <>
          {roadmap.order === "Custom" && (
            <div className="mt-7">
              <h3 className="font-medium">Arrange all 30 Juz</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Move a Juz up or down, then save the complete order. Pausing remains separate.
              </p>
              <ol
                className="my-4 max-h-[420px] overflow-y-auto rounded-md border"
                aria-label="Custom memorization order"
              >
                {sequence.map((juz, index) => (
                  <li
                    key={juz}
                    className="flex min-h-14 items-center justify-between border-b px-3 last:border-b-0"
                  >
                    <span>
                      <span className="text-muted-foreground mr-4 text-sm tabular-nums">
                        {index + 1}.
                      </span>
                      Juz {juz}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending || index === 0}
                        aria-label={`Move Juz ${juz} earlier`}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending || index === 29}
                        aria-label={`Move Juz ${juz} later`}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={16} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              <Button
                disabled={pending}
                onClick={() => void apply({ order: "Custom", juzSequence: sequence })}
              >
                Save custom order
              </Button>
            </div>
          )}
          <div className="mt-8">
            <h3 className="font-medium">Set a Juz aside</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Paused Juz are skipped for new memorization. Their learned pages still receive
              revision.
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6">
              {[...roadmap.entries]
                .sort((a, b) => a.juzNumber - b.juzNumber)
                .map((entry) => (
                  <Button
                    key={entry.juzNumber}
                    variant={entry.paused ? "secondary" : "outline"}
                    size="sm"
                    className="px-0 tabular-nums"
                    disabled={pending}
                    aria-pressed={entry.paused}
                    aria-label={`${entry.paused ? "Resume" : "Pause"} Juz ${entry.juzNumber}`}
                    onClick={() =>
                      void apply({ juzNumber: entry.juzNumber, paused: !entry.paused })
                    }
                  >
                    {entry.paused && <span className="mr-1 text-xs">Ⅱ</span>}
                    {entry.juzNumber}
                  </Button>
                ))}
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              {roadmap.pausedJuz.length
                ? `Paused: Juz ${roadmap.pausedJuz.join(", ")}.`
                : "No Juz are paused."}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Next up: Juz {roadmap.juzSequence.slice(0, 5).join(" → ")}
              {roadmap.juzSequence.length > 5 ? " → …" : ""}
            </p>
          </div>
        </>
      )}
      {pending && (
        <p role="status" className="text-muted-foreground mt-4 text-sm">
          Saving…
        </p>
      )}
      {notice && (
        <p role="status" className="text-primary mt-4 flex items-center gap-2 text-sm">
          <Check size={16} />
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="text-destructive mt-4">
          <p>{error}</p>
          {!roadmap && (
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
