import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/80 border-transparent",
        variant === "secondary" &&
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent",
        variant === "destructive" &&
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent",
        variant === "outline" && "text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
