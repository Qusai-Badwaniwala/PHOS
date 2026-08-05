"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTHOR } from "@/components/about/guide-content";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  RotateCcw,
  GraduationCap,
  BarChart3,
  History,
  Database,
  Settings,
  Info,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Memorization", href: "/session", icon: BookOpen },
  { name: "Revision", href: "/revision", icon: RotateCcw },
  { name: "Exams", href: "/exams", icon: GraduationCap },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "History", href: "/history", icon: History },
  { name: "Backup", href: "/backup", icon: Database },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "About", href: "/about", icon: Info },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5"
          onClick={onNavigate}
          aria-label="PHOS — Go to Dashboard"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/15">
            <BookOpen className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight text-foreground">PHOS</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Hifz System
            </span>
          </div>
        </Link>
      </div>

      {/*
        Author credit, sitting between the wordmark and the navigation.
        Uses the `gold` token reserved for attribution, with a slow
        sheen sweeping across the name — the animation is disabled under
        Reduced Motion by the global rule in `globals.css`.

        Deliberately given real size rather than the footnote it started
        as: this is a signature, and it should read as one. It stays
        uppercase and letterspaced so the eye files it as a colophon
        rather than a ninth navigation item, and both words are set at
        one size — "By" and the name read as a single phrase.
      */}
      <div className="shrink-0 border-b px-5 py-3">
        <p className="phos-shimmer text-center text-sm font-semibold uppercase tracking-[0.2em]">
          By {AUTHOR}
        </p>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul role="list" className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t px-5 py-4">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
          Personal Hifz Operating System
        </p>
      </div>
    </div>
  );
}
