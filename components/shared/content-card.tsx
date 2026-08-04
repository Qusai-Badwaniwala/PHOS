import { cn } from "@/lib/utils";
import React from "react";

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  /** Optional: make the card a focusable region (e.g. for interactive cards) */
  as?: "div" | "article" | "section";
  /** Optional DOM id, so the card can be targeted by in-page anchor links. */
  id?: string;
}

export function ContentCard({ children, className, as: Tag = "div", id }: ContentCardProps) {
  return (
    <Tag
      id={id}
      className={cn(
        // `content-card` carries no styles of its own — it is the hook
        // Compact Mode targets in `globals.css`.
        "content-card rounded-lg border bg-card text-card-foreground",
        "p-5 shadow-card md:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
