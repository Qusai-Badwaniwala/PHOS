import { cn } from "@/lib/utils";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface HistorySkeletonProps {
  className?: string;
}

export function HistorySkeleton({ className }: HistorySkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-72" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>

      <Skeleton className="h-96 w-full" />
    </div>
  );
}
