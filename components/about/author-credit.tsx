import React from "react";
import { cn } from "@/lib/utils";
import { AUTHOR } from "./guide-content";

type AuthorCreditVariant =
  /** Display size, for the About masthead. The name carries the weight. */
  | "hero"
  /** Small caps under a rule, for a page footer. */
  | "colophon";

interface AuthorCreditProps {
  className?: string;
  variant?: AuthorCreditVariant;
}

/**
 * The "By Qusai" credit.
 *
 * Uses the `gold` design token, which exists for this and nothing else
 * (see the note beside `--gold` in `globals.css`).
 *
 * Two weights, because the credit does two different jobs. At the top
 * of About — a page whose entire subject is PHOS and the thinking
 * behind it — authorship is part of what the reader came for, so the
 * name is set at display size with the gold sheen across it. At the
 * bottom of the same page, and anywhere else, it returns to a
 * colophon: a thin rule and small caps, which is the right weight for a
 * signature in an application whose design argument is that it should
 * stay out of the way.
 *
 * "By" and the name are set at one size in both. Sizing them
 * separately was tried and looked broken rather than deliberate — the
 * two words read as one phrase, so splitting their weight fights how
 * the eye takes them in.
 *
 * The sheen animation is disabled under Reduced Motion by the global
 * rule in `globals.css`.
 */
export function AuthorCredit({ className, variant = "colophon" }: AuthorCreditProps) {
  if (variant === "hero") {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <p className="phos-shimmer text-2xl font-semibold tracking-[0.06em] sm:text-3xl">
          By {AUTHOR}
        </p>
        {/* Rules taper into the background rather than stopping dead,
            so the name reads as engraved rather than boxed in. */}
        <span className="mt-4 flex w-full max-w-[16rem] items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/45" />
          <span className="h-1 w-1 rotate-45 bg-gold/50" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/45" />
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="h-px w-16 bg-gold/40" aria-hidden="true" />
      <p className="text-xs uppercase tracking-[0.2em] text-gold">By {AUTHOR}</p>
    </div>
  );
}
