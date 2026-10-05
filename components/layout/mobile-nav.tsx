"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, isCurrentPath } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  GraduationCap,
  BarChart3,
  Settings,
} from "lucide-react";

/**
 * The six destinations that matter on a phone.
 *
 * `label` is deliberately shorter than the sidebar's name for the same
 * route. Six items across a 360px screen leave about 60px each, and
 * "Memorization" at 10px needs more than that — it would either wrap to
 * two lines and push the bar upward over the content, or clip mid-word.
 * The sidebar, which has room to spare, keeps the full names.
 */
const mobileNavigation = [
  { name: "Dashboard", label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Memorization", label: "Memorize", href: "/session", icon: BookOpen },
  { name: "Revision", label: "Revision", href: "/revision", icon: RotateCcw },
  { name: "Exams", label: "Exams", href: "/exams", icon: GraduationCap },
  { name: "Analytics", label: "Stats", href: "/analytics", icon: BarChart3 },
  { name: "Settings", label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      /*
        The bottom bar is the heaviest floating surface in the app and
        should read as the thickest: a stronger blur, a real shadow
        lifting it off the page, and a bright top edge where the light
        catches the material. See `top-nav.tsx` for why the border went.
      */
      className="material-chrome scroll-edge-top bg-background/70 shadow-raised fixed right-0 bottom-0 left-0 z-40 backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      aria-label="Mobile navigation"
      role="navigation"
    >
      <div className="safe-area-bottom flex items-stretch">
        {mobileNavigation.map((item) => {
          const isActive = isCurrentPath(pathname, item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              /*
                `flex-1 min-w-0` shares the width evenly however narrow
                the screen is. The previous `min-w-[3rem] px-4` gave each
                item a fixed floor of roughly 5rem, which five items just
                survived and six would have overflowed.
              */
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium transition-colors",
                "touch-manipulation",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
              // The full name for screen readers, which have no reason to
              // hear an abbreviation the layout forced on sighted users.
              aria-label={item.name}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "")}
                aria-hidden="true"
              />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
