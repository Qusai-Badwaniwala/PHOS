import { cn } from "@/lib/utils";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Loading...", className }: LoadingScreenProps) {
  return (
    <div role="status" className={cn("mx-auto min-h-[50vh] w-full max-w-xl py-12", className)}>
      <p className="text-muted-foreground mb-8 text-sm">{message}</p>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-64" />
        <div className="border-border space-y-6 border-y py-7">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
