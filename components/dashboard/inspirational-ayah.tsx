"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { inspirationalAyahs } from "@/lib/constants/ayahs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface InspirationalAyahProps {
  className?: string;
}

export function InspirationalAyah({ className }: InspirationalAyahProps) {
  const [index, setIndex] = React.useState(0);
  const ayah = inspirationalAyahs[index];

  const next = () => setIndex((i) => (i + 1) % inspirationalAyahs.length);
  const prev = () =>
    setIndex((i) => (i - 1 + inspirationalAyahs.length) % inspirationalAyahs.length);

  // `index` is always kept within bounds by next()/prev(), so this is
  // unreachable in practice; it satisfies the compiler without
  // suppressing the check, and degrades safely if the ayah list is ever
  // empty.
  if (!ayah) return null;

  return (
    <figure
      className={cn(
        "relative rounded-xl border bg-card",
        "px-6 py-8 text-center shadow-card md:px-10 md:py-10",
        className,
      )}
      aria-label="Inspirational Ayah"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {/* Arabic text */}
        <blockquote>
          <p
            className="text-2xl font-medium leading-[2.5] text-foreground md:text-3xl"
            dir="rtl"
            lang="ar"
          >
            {ayah.arabic}
          </p>
        </blockquote>

        {/* Translation */}
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {ayah.translation}
        </p>

        {/* Reference */}
        <figcaption className="text-xs font-medium tracking-wide text-muted-foreground/70">
          {ayah.surah} · {ayah.reference}
        </figcaption>
      </div>

      {/* Navigation */}
      <div
        className="mt-6 flex items-center justify-center gap-2"
        role="navigation"
        aria-label="Ayah navigation"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={prev}
          aria-label="Previous ayah"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {index + 1} / {inspirationalAyahs.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={next}
          aria-label="Next ayah"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </figure>
  );
}
