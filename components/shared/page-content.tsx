import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("page-content", className)}>{children}</div>;
}
