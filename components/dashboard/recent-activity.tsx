import { cn } from "@/lib/utils";
import React from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookOpen, RotateCcw, Database, Award, Settings } from "lucide-react";
import type { ActivityItemDTO } from "@/types/dto";

interface RecentActivityProps {
  activities?: ActivityItemDTO[];
  className?: string;
}

function ActivityIcon({ type }: { type: ActivityItemDTO["type"] }) {
  switch (type) {
    case "session":
      return <BookOpen className="h-4 w-4" aria-hidden="true" />;
    case "revision":
      return <RotateCcw className="h-4 w-4" aria-hidden="true" />;
    case "backup":
      return <Database className="h-4 w-4" aria-hidden="true" />;
    case "milestone":
      return <Award className="h-4 w-4" aria-hidden="true" />;
    // `ActivityType` also includes "settings"; without this case the
    // component silently rendered no icon for such entries.
    case "settings":
      return <Settings className="h-4 w-4" aria-hidden="true" />;
  }
}

export function RecentActivity({ activities, className }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className={cn(className)}>
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <EmptyState
          title="No recent activity"
          description="Complete your first session to see activity here."
        />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="hover:bg-accent/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                <ActivityIcon type={activity.type} />
              </div>
              <div>
                <p className="text-sm font-medium">{activity.title}</p>
                {activity.detail && <p className="text-foreground/80 text-xs">{activity.detail}</p>}
                <p className="text-muted-foreground text-xs">{activity.date}</p>
              </div>
            </div>
            <StatusBadge
              status={
                activity.status === "completed"
                  ? "completed"
                  : activity.status === "failed"
                    ? "error"
                    : "pending"
              }
            >
              {activity.status}
            </StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}
