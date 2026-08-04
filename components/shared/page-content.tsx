import { cn } from "@/lib/utils";
import React from "react";

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContent
 * Standardized wrapper for all PHOS feature pages.
 * Handles mobile bottom-nav spacing and consistent vertical rhythm.
 *
 * The `page-content` class carries no styles of its own — it is the
 * hook Compact Mode targets in `globals.css`.
 *
 * BOTTOM SPACING
 * --------------
 * The clearance below must follow the same breakpoint that hides the
 * bottom navigation, which is `lg`. It previously dropped to `pb-8` at
 * `md`, so between 768px and 1023px a ~60px fixed nav sat over content
 * that had reserved only 32px for it — the last control on every page
 * using this wrapper was partly hidden. Reported from a screenshot of
 * Settings, where "Time Format" disappeared behind the bar.
 *
 * That band is not an edge case: it is tablets in portrait, split-screen
 * on a laptop, and any half-width browser window. `app/session` and
 * `app/revision` were unaffected only because they hand-roll
 * `pb-20 lg:pb-0`, which tracks the right breakpoint.
 */
export function PageContent({ children, className }: PageContentProps) {
  return <div className={cn("page-content space-y-5 pb-24 lg:pb-0", className)}>{children}</div>;
}
