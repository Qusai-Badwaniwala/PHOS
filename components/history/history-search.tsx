"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface HistorySearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function HistorySearch({ value, onChange, className }: HistorySearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4"
        aria-hidden="true"
      />
      {/*
        `type="search"` and an explicit label, because a placeholder is
        not an accessible name: it disappears as soon as the user types,
        and a screen reader announced this as an unlabelled text box
        next to a decorative icon. The magnifier is `aria-hidden`, so
        without this there was nothing at all to say what the field
        searched.
      */}
      <Input
        type="search"
        aria-label="Search history"
        placeholder="Search history..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
