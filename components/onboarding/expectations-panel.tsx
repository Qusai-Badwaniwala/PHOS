import React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { CLOSING_NOTE, IMPORTANT_MESSAGE, PHOS_DOES, PHOS_DOES_NOT } from "./onboarding-copy";

/**
 * "What PHOS is — and isn't" (PRODUCT_REQUIREMENTS Requirement 6).
 *
 * Shared by the first-run wizard and the About page, because
 * Requirement 6 requires this information both at first launch and
 * "accessible later from About" — one component means the two can never
 * say different things.
 */
export function ExpectationsPanel({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold">PHOS helps you by</h3>
          <ul className="space-y-2">
            {PHOS_DOES.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">PHOS does not</h3>
          <ul className="space-y-2">
            {PHOS_DOES_NOT.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-md border-l-2 border-primary bg-muted/50 p-4">
        <p className="text-sm">{IMPORTANT_MESSAGE}</p>
        <p className="mt-2 text-sm italic text-muted-foreground">{CLOSING_NOTE}</p>
      </div>
    </div>
  );
}
