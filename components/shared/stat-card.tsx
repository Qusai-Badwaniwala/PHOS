import { cn } from "@/lib/utils";
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ title, value, description, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-card",
        "flex flex-col gap-1 p-5 md:p-6",
        className,
      )}
      role="group"
      aria-label={`${title}: ${value}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium",
              trend === "up" && "text-emerald-600 dark:text-emerald-400",
              trend === "down" && "text-rose-600 dark:text-rose-400",
              trend === "neutral" && "text-muted-foreground",
            )}
            aria-label={`Trending ${trend}`}
          >
            {trend === "up" && <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />}
            {trend === "down" && <TrendingDown className="mr-1 h-3 w-3" aria-hidden="true" />}
            {trend === "neutral" && <Minus className="mr-1 h-3 w-3" aria-hidden="true" />}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
