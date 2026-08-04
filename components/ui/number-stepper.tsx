"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Amount one press of − or + moves the value. */
  step?: number;
  /** Rendered after the value, e.g. "minutes". Purely decorative. */
  suffix?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * A themed replacement for a native `<input type="number">` spinner.
 *
 * The browser's own spinner arrows cannot be styled — they render as a
 * small white control that ignores the application's theme entirely and
 * is close to invisible in dark mode. Rather than hide the arrows and
 * leave the field typing-only, this gives the same affordance with real
 * buttons: bigger targets (which also makes it usable on a phone),
 * correct colours in both themes, and clamping the caller can rely on.
 *
 * The text field stays editable, so a user entering 45 does not have to
 * press + fifteen times.
 */
export function NumberStepper({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: NumberStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  // Floating-point steps (0.5 pages) accumulate error quickly —
  // 0.1 + 0.2 style drift would show the user "1.5000000000000002".
  const round = (next: number) => Math.round(next * 100) / 100;

  const commit = (next: number) => {
    if (Number.isNaN(next)) return;
    onChange(round(clamp(next)));
  };

  /**
   * What the field shows while the user is part-way through typing.
   *
   * `null` means "not being edited", and the committed `value` is
   * shown. Anything else is the user's own half-finished text, left
   * alone until they leave the field.
   *
   * This exists because clamping on every keystroke is hostile once
   * `min` is above 1. Clearing the field made `Number("")` zero, which
   * clamped straight up to `min` — so a user replacing 30 with 45
   * watched the box snap to 5 and then typed into it, ending with
   * **545 minutes**. Both bounds are inside the allowed range, so
   * nothing complained: onboarding simply recorded a nine-hour daily
   * study budget. The same trap caught any value whose first digit is
   * below `min`.
   *
   * Found by `tests/ui/study-inputs.test.tsx`, which clears the field
   * and types the way a person does rather than replacing the value
   * atomically.
   */
  const [draft, setDraft] = React.useState<string | null>(null);

  const handleType = (raw: string) => {
    setDraft(raw);
    const parsed = Number(raw);
    // Committed unclamped, so an intermediate like "4" on the way to
    // "45" survives. The bounds are applied on blur, and every caller
    // validates its own range again before storing anything.
    if (raw !== "" && !Number.isNaN(parsed)) onChange(round(parsed));
  };

  const handleBlur = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    setDraft(null);
    // An emptied field reverts to the last good value rather than
    // becoming zero — "no time to study today" is not what the user
    // meant by clearing the box.
    if (draft !== "" && !Number.isNaN(parsed)) commit(parsed);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= min}
        // Any half-typed text is abandoned: pressing a stepper is an
        // unambiguous request for the committed value ± one step.
        onClick={() => {
          setDraft(null);
          commit(value - step);
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="relative flex-1">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={draft ?? value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => handleType(event.target.value)}
          onBlur={handleBlur}
          className={cn("text-center tabular-nums", suffix && "pr-16")}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => {
          setDraft(null);
          commit(value + step);
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
