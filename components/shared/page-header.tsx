import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-4 md:pb-6",
        "md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        {/* h2 here — h1 is provided by TopNav for SEO and screen readers */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="mt-3 flex shrink-0 items-center gap-2 md:mt-0">{children}</div>}
    </div>
  );
}
