import { cn } from "@/lib/utils";
import React from "react";
import { ContentCard } from "./content-card";

interface InfoCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, icon, children, className }: InfoCardProps) {
  return (
    <ContentCard className={cn(className)}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </ContentCard>
  );
}
