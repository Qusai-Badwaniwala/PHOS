"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  /** Human-readable label for each registered option value. */
  labels: Readonly<Record<string, string>>;
  registerLabel: (value: string, label: string) => void;
} | null>(null);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("Select components must be used within Select");
  return context;
}

const Select = ({
  children,
  value,
  onValueChange,
  defaultValue,
  disabled = false,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);
  // Each SelectItem reports its own label here so the trigger can show
  // "MM/DD/YYYY" rather than the raw stored value "mdy". Without this
  // the closed select displays whatever machine-readable string the
  // caller happens to persist, which is never what the user chose from.
  const [labels, setLabels] = React.useState<Record<string, string>>({});

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const registerLabel = React.useCallback((itemValue: string, label: string) => {
    setLabels((current) =>
      current[itemValue] === label ? current : { ...current, [itemValue]: label },
    );
  }, []);

  const handleChange = (val: string) => {
    if (disabled) return;
    if (!isControlled) setInternalValue(val);
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleChange,
        open: open && !disabled,
        setOpen,
        disabled,
        labels,
        registerLabel,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, disabled, ...props }, ref) => {
  const { open, setOpen, disabled: selectDisabled } = useSelect();
  const isDisabled = disabled ?? selectDisabled;
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={isDisabled}
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value, labels } = useSelect();
  // Prefer the selected option's label; fall back to the raw value only
  // if no matching item has registered one yet.
  const display = value ? (labels[value] ?? value) : "";
  return <span className={cn(!display && "text-muted-foreground")}>{display || placeholder}</span>;
};

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open } = useSelect();
    // Kept mounted and hidden rather than unmounted when closed, so
    // each SelectItem can register its label with the context and the
    // trigger can show "MM/DD/YYYY" before the menu has ever been
    // opened. `hidden` removes it from layout, from the accessibility
    // tree and from the tab order, so a closed select is inert.
    return (
      <div
        ref={ref}
        role="listbox"
        hidden={!open}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  },
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange, registerLabel } = useSelect();
  const isSelected = selectedValue === value;

  // Report this option's text so the trigger can display it. Only
  // plain-string children are usable as a label; anything richer falls
  // back to the raw value, which is the existing behaviour.
  const label = typeof children === "string" ? children : undefined;
  React.useEffect(() => {
    if (label !== undefined) registerLabel(value, label);
  }, [label, value, registerLabel]);

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      onClick={() => onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      {children}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
