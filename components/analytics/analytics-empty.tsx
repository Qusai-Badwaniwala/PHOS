import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyProps {
  className?: string;
}

export function AnalyticsEmpty({ className }: AnalyticsEmptyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/*
        The page keeps its own title in the empty state.

        Every empty component returned *before* its page rendered
        `PageHeader`, so an empty screen lost its heading entirely: the
        outline went straight from the `TopNav` h1 to the empty state's
        h3, skipping a rank, and the user was left on a page that no
        longer said what it was. The empty state is the one moment a
        screen most needs to identify itself.
      */}
      <PageHeader
        title="Analytics"
        description="Understand your memorization health and long-term trends."
      />

      <EmptyState
        title="Analytics not available"
        description="Complete more sessions to unlock meaningful insights about your memorization journey."
      />
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link href="/session">Start a Session</Link>
        </Button>
      </div>
    </div>
  );
}
