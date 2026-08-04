import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardEmptyProps {
  className?: string;
}

export function DashboardEmpty({ className }: DashboardEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <EmptyState
        title="Welcome to PHOS"
        description="Your personal Hifz journey begins here. Start by creating your first session."
      />
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link href="/session">Start Session</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings">Configure</Link>
        </Button>
      </div>
    </div>
  );
}
