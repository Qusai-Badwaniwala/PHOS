import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import { Calendar } from "lucide-react";
import type { DayProgressDTO } from "@/types/dto";

interface WeeklyProgressProps {
  days?: DayProgressDTO[];
  className?: string;
}

const defaultDays: DayProgressDTO[] = [
  { day: "Mon", completed: false },
  { day: "Tue", completed: false },
  { day: "Wed", completed: false },
  { day: "Thu", completed: false },
  { day: "Fri", completed: false },
  { day: "Sat", completed: false },
  { day: "Sun", completed: false },
];

export function WeeklyProgress({ days = defaultDays, className }: WeeklyProgressProps) {
  const completedCount = days.filter((d) => d.completed).length;
  const totalCount = days.length;

  return (
    <ContentCard className={cn(className)}>
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="font-semibold">Weekly Progress</h3>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} days
        </span>
        <span className="text-sm font-medium">
          {Math.round((completedCount / totalCount) * 100)}%
        </span>
      </div>

      <div className="flex gap-2">
        {days.map((day) => (
          <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-md text-xs font-medium transition-colors",
                day.completed
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
              aria-label={`${day.day}: ${day.completed ? "Completed" : "Not completed"}`}
            >
              {day.day.charAt(0)}
            </div>
            <span className="text-[10px] text-muted-foreground">{day.day}</span>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
