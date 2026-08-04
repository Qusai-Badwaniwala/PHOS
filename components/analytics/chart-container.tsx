import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "@/components/shared/content-card";

interface ChartContainerProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ChartContainer({ title, description, children, className }: ChartContainerProps) {
  return (
    <ContentCard className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex min-h-[250px] flex-1 items-center justify-center">{children}</div>
    </ContentCard>
  );
}
