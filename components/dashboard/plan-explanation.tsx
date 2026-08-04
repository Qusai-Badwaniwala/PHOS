import React from "react";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/shared/content-card";
import { Lightbulb } from "lucide-react";
import type { PlanExplanationDTO } from "@/types/dto";

interface PlanExplanationCardProps {
  explanation: PlanExplanationDTO;
  className?: string;
}

/**
 * Explains today's plan in the user's own terms
 * (PRODUCT_REQUIREMENTS Requirement 4, "Transparent Recommendations").
 *
 * Every line comes from the Adaptive Engine, unmodified — see
 * `engines/adaptive/calculators/ExplanationCalculator.ts`. Rewording it
 * here would create a second account of the engine's reasoning that
 * nothing verifies, which is exactly the "misleading or fabricated
 * explanation" the requirement rules out.
 *
 * Renders nothing when there is no headline, so an ordinary day is not
 * padded with an empty card.
 */
export function PlanExplanationCard({ explanation, className }: PlanExplanationCardProps) {
  if (!explanation.headline) return null;

  return (
    <ContentCard className={cn(className)}>
      <div className="flex gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-sm font-medium">{explanation.headline}</p>
          {explanation.details.length > 0 && (
            <ul className="space-y-1.5">
              {explanation.details.map((detail) => (
                <li key={detail} className="text-sm leading-relaxed text-muted-foreground">
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </ContentCard>
  );
}
