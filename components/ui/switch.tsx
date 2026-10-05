"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState(false);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const toggle = () => {
    const newValue = !isChecked;
    if (!isControlled) setInternalChecked(newValue);
    onCheckedChange?.(newValue);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={toggle}
      className={cn(
        "peer focus-visible:ring-ring inline-flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors",
          isChecked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "bg-background pointer-events-none block h-5 w-5 rounded-full shadow-sm ring-0 transition-transform duration-200",
            isChecked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
});
Switch.displayName = "Switch";

export { Switch };
