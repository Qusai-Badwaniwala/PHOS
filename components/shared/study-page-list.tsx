import React from "react";
import { cn } from "@/lib/utils";
import type { StudyPageDTO } from "@/types/dto";

interface StudyPageListProps {
  pages: StudyPageDTO[];
  className?: string;
}

/**
 * Lists the pages of an assignment, naming the surahs on each.
 *
 * A page number is the right *scheduling* unit but often the wrong
 * *description*. Twelve pages of Juz 30 carry two or three surahs each,
 * so "page 602" tells a memorizer almost nothing while "Quraysh ·
 * Al-Ma'un · Al-Kawthar" tells them exactly what to open the Mushaf and
 * do. Elsewhere a page is a fragment of one long surah, and naming it
 * once is enough.
 *
 * The page number stays visible throughout — it is what PHOS schedules
 * and what the user will see everywhere else.
 */
export function StudyPageList({ pages, className }: StudyPageListProps) {
  if (pages.length === 0) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {pages.map((page) => {
        const surahs = page.surahs ?? [];
        return (
          <li
            key={page.pageId}
            className="border-border/60 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium tabular-nums">Page {page.pageNumber}</span>
            {page.juzNumber !== undefined && (
              <span className="text-muted-foreground text-xs">Juz {page.juzNumber}</span>
            )}
            {surahs.length > 0 && (
              <>
                <span className="text-muted-foreground text-sm">
                  {surahs.map((surah) => surah.name).join(" · ")}
                </span>
                <span lang="ar" dir="rtl" className="text-muted-foreground text-sm">
                  {surahs.map((surah) => surah.arabicName).join(" · ")}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
