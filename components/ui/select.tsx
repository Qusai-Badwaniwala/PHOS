"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
const Select = Primitive.Root;
const SelectValue = Primitive.Value;
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <Primitive.Trigger
    ref={ref}
    className={cn(
      "border-input bg-background flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <Primitive.Icon asChild>
      <ChevronDown size={16} aria-hidden="true" />
    </Primitive.Icon>
  </Primitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";
const SelectContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Content
      ref={ref}
      position="popper"
      sideOffset={6}
      className={cn(
        "select-panel bg-popover text-popover-foreground z-[80] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border shadow-lg",
        className,
      )}
      {...props}
    >
      <Primitive.ScrollUpButton className="flex h-8 justify-center">
        <ChevronUp size={16} />
      </Primitive.ScrollUpButton>
      <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
      <Primitive.ScrollDownButton className="flex h-8 justify-center">
        <ChevronDown size={16} />
      </Primitive.ScrollDownButton>
    </Primitive.Content>
  </Primitive.Portal>
));
SelectContent.displayName = "SelectContent";
const SelectItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ className, children, ...props }, ref) => (
  <Primitive.Item
    ref={ref}
    className={cn(
      "data-[highlighted]:bg-accent relative flex min-h-11 cursor-default items-center rounded px-9 py-2 text-base outline-none select-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <Primitive.ItemIndicator className="absolute left-3">
      <Check size={16} />
    </Primitive.ItemIndicator>
    <Primitive.ItemText>{children}</Primitive.ItemText>
  </Primitive.Item>
));
SelectItem.displayName = "SelectItem";
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
