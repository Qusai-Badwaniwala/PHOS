import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // File inputs: the browser's native "Choose file" button is
          // styled through the ::file-selector-button pseudo-element,
          // which inherits nothing from the field around it. The
          // previous `file:border-0 file:bg-transparent` stripped its
          // default chrome without putting anything back, leaving bare
          // black text that gave no sign it was clickable. These give it
          // the same shape and colour as a secondary button.
          "file:-my-2 file:-ml-3 file:mr-3 file:h-10 file:cursor-pointer file:rounded-l-md file:rounded-r-none file:border-0 file:border-r file:border-input file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80",
          // Number inputs: the native spinner arrows render as an
          // unstyleable white control that ignores the theme entirely
          // and is unreadable in dark mode. PHOS's number fields are all
          // typed or adjusted in whole steps, so the arrows are removed
          // rather than fought with.
          "[&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:[-moz-appearance:textfield]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
