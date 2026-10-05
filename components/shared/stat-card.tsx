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
        "bg-card text-card-foreground shadow-card rounded-lg border",
        "flex flex-col gap-1 p-5 md:p-6",
        className,
      )}
      role="group"
      aria-label={`${title}: ${value}`}
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
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
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
      )}
    </div>
  );
}
