import React from "react";
import { cn } from "@/lib/utils";
import { AUTHOR } from "./guide-content";
export function AuthorCredit({
  className,
  variant = "colophon",
}: {
  className?: string;
  variant?: "hero" | "colophon";
}) {
  return (
    <p
      className={cn(
        variant === "hero" ? "font-serif text-xl" : "text-muted-foreground text-sm",
        className,
      )}
    >
      By {AUTHOR}
    </p>
  );
}
