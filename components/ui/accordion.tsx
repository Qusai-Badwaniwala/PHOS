"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/**
 * A minimal accordion.
 *
 * Reworked in Phase 7, when the About page's FAQ became its first real
 * consumer. Two things changed:
 *
 * - **The item's identity now comes from context, not a `data-value`
 *   attribute read back through `any`.** Previously `AccordionTrigger`
 *   recovered its own value by casting props, so a trigger placed
 *   without the right attribute silently never opened — a mistake the
 *   compiler could not catch. `AccordionItem` now supplies it.
 * - **It is now operable and announced.** Triggers carry
 *   `aria-expanded` and `aria-controls`, panels are labelled by their
 *   trigger, and both `single`/`multiple` and `collapsible` are
 *   honoured rather than accepted and ignored.
 */

type AccordionValue = string | null;

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
/** Supplies the enclosing item's value, so triggers and panels need no props of their own. */
const AccordionItemContext = React.createContext<string | null>(null);

function useAccordion(): AccordionContextValue {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("Accordion components must be used within Accordion");
  return context;
}

function useAccordionItemValue(): string {
  const value = React.useContext(AccordionItemContext);
  if (value === null) {
    throw new Error("AccordionTrigger and AccordionContent must be used within an AccordionItem");
  }
  return value;
}

const Accordion = ({
  children,
  type = "single",
  collapsible = true,
  value,
  onValueChange,
  defaultValue = null,
}: {
  children: React.ReactNode;
  /** `single` closes the open panel when another opens; `multiple` allows several. */
  type?: "single" | "multiple";
  /** Whether clicking the open panel's trigger closes it. Only meaningful for `single`. */
  collapsible?: boolean;
  value?: AccordionValue;
  onValueChange?: (value: AccordionValue) => void;
  defaultValue?: AccordionValue;
}) => {
  const [internalSingle, setInternalSingle] = React.useState<AccordionValue>(defaultValue);
  const [openSet, setOpenSet] = React.useState<Set<string>>(
    () => new Set(defaultValue ? [defaultValue] : []),
  );

  const isControlled = value !== undefined;
  const currentSingle = isControlled ? value : internalSingle;

  const isOpen = React.useCallback(
    (itemValue: string) =>
      type === "multiple" ? openSet.has(itemValue) : currentSingle === itemValue,
    [type, openSet, currentSingle],
  );

  const toggle = React.useCallback(
    (itemValue: string) => {
      if (type === "multiple") {
        setOpenSet((current) => {
          const next = new Set(current);
          if (next.has(itemValue)) next.delete(itemValue);
          else next.add(itemValue);
          return next;
        });
        return;
      }

      const alreadyOpen = currentSingle === itemValue;
      // With `collapsible: false`, re-clicking the open panel keeps it
      // open rather than leaving the accordion with nothing showing.
      const next = alreadyOpen && collapsible ? null : itemValue;
      if (!isControlled) setInternalSingle(next);
      onValueChange?.(next);
    },
    [type, currentSingle, collapsible, isControlled, onValueChange],
  );

  const contextValue = React.useMemo(() => ({ isOpen, toggle }), [isOpen, toggle]);

  return (
    <AccordionContext.Provider value={contextValue}>
      <div className="w-full">{children}</div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
  <AccordionItemContext.Provider value={value}>
    <div ref={ref} className={cn("border-b", className)} {...props}>
      {children}
    </div>
  </AccordionItemContext.Provider>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, toggle } = useAccordion();
  const itemValue = useAccordionItemValue();
  const open = isOpen(itemValue);

  return (
    <button
      ref={ref}
      type="button"
      id={`accordion-trigger-${itemValue}`}
      aria-expanded={open}
      aria-controls={`accordion-panel-${itemValue}`}
      onClick={() => toggle(itemValue)}
      className={cn(
        "flex w-full flex-1 items-center justify-between gap-4 py-4 text-left font-medium transition-all hover:underline",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        aria-hidden="true"
        className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
      />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { isOpen } = useAccordion();
    const itemValue = useAccordionItemValue();

    if (!isOpen(itemValue)) return null;

    return (
      <div
        ref={ref}
        id={`accordion-panel-${itemValue}`}
        role="region"
        aria-labelledby={`accordion-trigger-${itemValue}`}
        className={cn("overflow-hidden text-sm", className)}
        {...props}
      >
        <div className="pt-0 pb-4">{children}</div>
      </div>
    );
  },
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
