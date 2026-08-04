import { cn } from "@/lib/utils";
import React from "react";

/**
 * FeatureGrid
 * Standardized two-column layout used across Session, Revision, and similar pages.
 * Left column is wider (2/3), right column is sidebar (1/3).
 */
interface FeatureGridProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
}

export function FeatureGrid({ main, sidebar, className }: FeatureGridProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-3", className)}>
      <div className="space-y-6 lg:col-span-2">{main}</div>
      <div className="space-y-4">{sidebar}</div>
    </div>
  );
}
