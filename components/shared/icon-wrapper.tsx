import { cn } from "@/lib/utils";
import React from "react";

interface IconWrapperProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "muted" | "primary" | "success" | "warning" | "error";
  className?: string;
}

export function IconWrapper({
  children,
  size = "md",
  variant = "muted",
  className,
}: IconWrapperProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" && "h-6 w-6",
        size === "md" && "h-8 w-8",
        size === "lg" && "h-12 w-12",
        variant === "default" && "border bg-background",
        variant === "muted" && "bg-muted",
        variant === "primary" && "bg-primary/10 text-primary",
        variant === "success" && "bg-success-muted text-success",
        variant === "warning" && "bg-warning-muted text-warning",
        variant === "error" && "bg-destructive/15 text-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
}
