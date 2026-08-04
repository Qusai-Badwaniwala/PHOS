"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw, Database, Award, Settings, X, Calendar, Clock } from "lucide-react";
import type { TimelineEntryDTO } from "@/types/dto";

interface HistoryDrawerProps {
  entry: TimelineEntryDTO | null;
  onClose: () => void;
  className?: string;
}

function DrawerIcon({ type }: { type: TimelineEntryDTO["type"] }) {
  const iconClass = "h-5 w-5 text-muted-foreground";
  switch (type) {
    case "session":
      return <BookOpen className={iconClass} />;
    case "revision":
      return <RotateCcw className={iconClass} />;
    case "backup":
      return <Database className={iconClass} />;
    case "milestone":
      return <Award className={iconClass} />;
    case "settings":
      return <Settings className={iconClass} />;
  }
}

export function HistoryDrawer({ entry, onClose, className }: HistoryDrawerProps) {
  if (!entry) return null;

  return (
    <div className={cn("fixed inset-0 z-50", className)}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <div className="fixed bottom-0 right-0 top-0 w-full max-w-md overflow-y-auto border-l bg-background shadow-xl">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <DrawerIcon type={entry.type} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{entry.title}</h2>
                <span className="text-xs capitalize text-muted-foreground">{entry.type}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{entry.date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">{entry.time}</span>
            </div>
            {entry.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  status={
                    entry.status === "completed"
                      ? "completed"
                      : entry.status === "failed"
                        ? "error"
                        : "pending"
                  }
                >
                  {entry.status}
                </StatusBadge>
              </div>
            )}
          </div>

          {entry.description && (
            <ContentCard>
              <h3 className="mb-2 font-semibold">Details</h3>
              <p className="text-sm text-muted-foreground">{entry.description}</p>
            </ContentCard>
          )}

          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
