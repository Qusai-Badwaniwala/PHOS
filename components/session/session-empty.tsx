import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SessionEmptyProps {
  className?: string;
}

export function SessionEmpty({ className }: SessionEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="No active session"
        description="Begin a new memorization session to get started with today's Sabaq."
      />
      <div className="flex justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
