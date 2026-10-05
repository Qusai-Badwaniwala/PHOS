import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  },
  size: {
    default: "min-h-12 px-5 py-2",
    sm: "min-h-11 rounded-md px-3",
    lg: "min-h-12 rounded-md px-8 py-2",
    icon: "h-11 w-11",
  },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  /**
   * Render the single child element with the button's styling instead
   * of wrapping it in a `<button>`.
   *
   * Used wherever the control is really a link: `<Button asChild><Link
   * …/></Button>`. Without it those call sites produced an `<a>` nested
   * inside a `<button>` — invalid HTML, two nested interactive controls
   * for a screen reader or keyboard user, and an activation path that
   * depends on which element wins the click.
   *
   * This prop was previously accepted and silently ignored while twelve
   * call sites relied on it, including every empty state and the
   * dashboard's two primary actions. Fixed in Phase 7.
   */
  asChild?: boolean;
}

const BUTTON_BASE_CLASSES =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const classes = cn(
      BUTTON_BASE_CLASSES,
      buttonVariants.variant[variant],
      buttonVariants.size[size],
      className,
    );

    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<{ className?: string }>;
      // The child's own classes are kept and the button's merged in, so
      // a `<Link className="flex gap-2">` does not lose its layout.
      const { children: _children, ...rest } = props;
      return React.cloneElement(child, {
        ...rest,
        className: cn(classes, child.props.className),
      } as Partial<typeof child.props>);
    }

    return <button className={classes} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
