import React from "react";
import { cn } from "@/lib/utils";
import { HandHeart } from "lucide-react";

interface WelcomeBackProps {
  message: string | null;
  className?: string;
}

/**
 * Greets a user returning after time away
 * (PRODUCT_REQUIREMENTS Requirement 5, "Recovery After Missed Days").
 *
 * Styled as a quiet, warm note rather than a warning: Requirement 5 is
 * explicit that "The application must never display messages implying
 * failure or guilt", so this deliberately avoids the destructive and
 * amber treatments used elsewhere for problems. The wording comes from
 * the Adaptive Engine, which is what actually adjusted the plan.
 */
export function WelcomeBack({ message, className }: WelcomeBackProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn("flex gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4", className)}
    >
      <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  );
}
