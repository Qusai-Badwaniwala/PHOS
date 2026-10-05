import React from "react";
import { cn } from "@/lib/utils";
import { Scale } from "lucide-react";

interface WorkloadNoticeProps {
  message: string | null;
  className?: string;
}

/**
 * Tells the user when today's plan is unusually heavy
 * (PRODUCT_REQUIREMENTS Requirement 7).
 *
 * Styled as a calm note, not a warning. The plan is not wrong and the
 * user has not done anything to be alerted about — PHOS is simply
 * saying the day is long and that stopping early costs nothing. An
 * amber or destructive treatment would read as an error, which is
 * exactly the "implying failure" tone Requirement 5 rules out.
 *
 * Deliberately paired with *no* dismiss action and *no* trimming
 * button: Requirement 9 leaves the decision with the user, and the
 * message already names what would cost least to leave.
 */
export function WorkloadNotice({ message, className }: WorkloadNoticeProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn("border-border bg-muted/50 flex gap-3 rounded-lg border p-4", className)}
    >
      <Scale className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
    </div>
  );
}
