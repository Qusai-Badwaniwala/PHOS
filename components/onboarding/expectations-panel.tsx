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
              <li key={item} className="text-muted-foreground flex gap-2 text-sm">
                <Check className="text-success mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">PHOS does not</h3>
          <ul className="space-y-2">
            {PHOS_DOES_NOT.map((item) => (
              <li key={item} className="text-muted-foreground flex gap-2 text-sm">
                <X className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-primary bg-muted/50 rounded-md border-l-2 p-4">
        <p className="text-sm">{IMPORTANT_MESSAGE}</p>
        <p className="text-muted-foreground mt-2 text-sm italic">{CLOSING_NOTE}</p>
      </div>
    </div>
  );
}
