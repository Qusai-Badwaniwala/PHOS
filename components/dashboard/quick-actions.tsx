import { cn } from "@/lib/utils";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, RotateCcw, BarChart3, History, Database, Settings } from "lucide-react";

const actions = [
  { label: "Session", href: "/session", icon: BookOpen, variant: "default" as const },
  { label: "Revision", href: "/revision", icon: RotateCcw, variant: "secondary" as const },
  { label: "Analytics", href: "/analytics", icon: BarChart3, variant: "outline" as const },
  { label: "History", href: "/history", icon: History, variant: "outline" as const },
  { label: "Backup", href: "/backup", icon: Database, variant: "outline" as const },
  { label: "Settings", href: "/settings", icon: Settings, variant: "ghost" as const },
];

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant} size="sm" asChild>
          <Link href={action.href} className="gap-2">
            <action.icon className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
