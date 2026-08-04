"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle, LogOut, Loader2 } from "lucide-react";
import type { SessionStatus } from "./session-header";

interface SessionControlsProps {
  status: SessionStatus;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onFinishLater?: () => void;
  /**
   * A backend request is in flight. Every control is disabled while
   * true, so a second click cannot start or complete the same session
   * twice — completion issues one request per page and can take several
   * seconds on a full assignment.
   */
  pending?: boolean;
  /** Optional progress text shown beside the controls during a long completion. */
  pendingLabel?: string;
  className?: string;
}

export function SessionControls({
  status,
  onStart,
  onPause,
  onResume,
  onComplete,
  onFinishLater,
  pending = false,
  pendingLabel,
  className,
}: SessionControlsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {status === "not_started" && (
        <Button size="lg" onClick={onStart} disabled={pending} className="flex-1 sm:flex-none">
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Start Session
        </Button>
      )}

      {status === "in_progress" && (
        <>
          <Button
            variant="secondary"
            size="lg"
            onClick={onPause}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onFinishLater}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Finish Later
          </Button>
        </>
      )}

      {status === "paused" && (
        <>
          <Button size="lg" onClick={onResume} disabled={pending} className="flex-1 sm:flex-none">
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onFinishLater}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Finish Later
          </Button>
        </>
      )}

      {(status === "in_progress" || status === "paused") && (
        <Button
          variant="default"
          size="lg"
          onClick={onComplete}
          disabled={pending}
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-4 w-4" />
          )}
          Complete
        </Button>
      )}

      {status === "interrupted" && (
        <>
          <Button size="lg" onClick={onResume} disabled={pending} className="flex-1 sm:flex-none">
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onFinishLater}
            disabled={pending}
            className="flex-1 sm:flex-none"
          >
            End Session
          </Button>
        </>
      )}

      {pending && pendingLabel && (
        <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {pendingLabel}
        </span>
      )}

      {status === "completed" && (
        <Button disabled size="lg" className="flex-1 sm:flex-none">
          <CheckCircle className="mr-2 h-4 w-4" />
          Completed
        </Button>
      )}
    </div>
  );
}
