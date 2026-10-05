import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div>
        <h1 className="text-[30px] leading-tight md:text-[36px]">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 max-w-xl">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
