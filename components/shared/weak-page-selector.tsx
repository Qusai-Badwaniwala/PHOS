"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { AlertTriangle } from "lucide-react";
import type { StudyPageDTO } from "@/types/dto";

interface WeakPageSelectorProps {
  pages: StudyPageDTO[];
  selected: ReadonlySet<string>;
  onToggle: (pageId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Lets the user flag the pages that felt shaky before completing.
 *
 * This is the recall input model PHOS uses: **pages default to a
 * successful recall, and the user marks only the exceptions.** The
 * alternative — an explicit verdict on every page — turns a 20-page
 * revision into 20 decisions, and a form that long gets answered
 * carelessly. Careless answers would feed the Memory Engine worse data
 * than the default does, so the cheap gesture that captures the case
 * that actually matters is the better design.
 *
 * Nothing here is required. Completing without flagging anything is a
 * legitimate, common answer, not a skipped step.
 */
export function WeakPageSelector({
  pages,
  selected,
  onToggle,
  disabled = false,
  className,
}: WeakPageSelectorProps) {
  if (pages.length === 0) return null;

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Anything feel shaky?</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Tap any page that did not come easily. PHOS will bring those back sooner. Leave them all
        untouched if the session went well.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {pages.map((page) => {
          const isWeak = selected.has(page.pageId);
          const surahs = page.surahs ?? [];

          /*
           * On a page carrying several surahs, the surah names are the
           * label — "page 602" is not something a memorizer can act on,
           * while "Quraysh · Al-Ma'un · Al-Kawthar" is exactly how they
           * would describe that work. Elsewhere a page is a fragment of
           * one long surah and the number is the natural handle, so it
           * leads and the surah follows quietly.
           *
           * The flag itself stays per *page*: that is the unit the
           * Memory Engine schedules, and inventing a per-surah memory
           * record would mean a second, parallel model of progress.
           */
          const isSurahDense = surahs.length > 1;
          const label = isSurahDense
            ? surahs.map((surah) => surah.name).join(" · ")
            : `${page.pageNumber}`;
          const accessibleName = isSurahDense
            ? `Page ${page.pageNumber}: ${surahs.map((s) => s.name).join(", ")}`
            : `Page ${page.pageNumber}`;

          return (
            <button
              key={page.pageId}
              type="button"
              disabled={disabled}
              aria-pressed={isWeak}
              aria-label={`${accessibleName}${isWeak ? ", marked as shaky" : ""}`}
              onClick={() => onToggle(page.pageId)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                !isSurahDense && "tabular-nums",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isWeak
                  ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                  : "hover:bg-accent",
              )}
            >
              {label}
              {isSurahDense && (
                <span className="ml-1.5 tabular-nums opacity-60">p.{page.pageNumber}</span>
              )}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">
          {selected.size} page{selected.size === 1 ? "" : "s"} marked.{" "}
          {selected.size === 1 ? "It" : "They"} will be scheduled again sooner, and the rest
          recorded as recalled well.
        </p>
      )}
    </ContentCard>
  );
}
