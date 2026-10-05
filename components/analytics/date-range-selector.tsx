"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DateRange = "today" | "week" | "month" | "year" | "all";

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: "today", label: "24 hours" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "year", label: "365 days" },
  { value: "all", label: "All Time" },
];

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={value === range.value}
          onClick={() => onChange(range.value)}
          className="text-xs"
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
