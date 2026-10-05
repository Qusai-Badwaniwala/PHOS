"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  MoreHorizontal,
  NotebookPen,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { LazyMotion, domAnimation, m, MotionConfig, useReducedMotion } from "motion/react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useSettings } from "@/providers/settings-provider";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { fetchActiveSession, type ActiveSession } from "@/lib/api/activeSession";
import { SessionType } from "@/shared/types";
import { cn } from "@/lib/utils";
import { watchRecordReplacement } from "@/lib/record-change";

const destinations = [
  { href: "/dashboard", label: "Today", icon: CalendarDays },
  { href: "/analytics", label: "My Hifz", icon: BookOpen },
  { href: "/exams", label: "Exams", icon: NotebookPen },
  { href: "/more", label: "More", icon: MoreHorizontal },
];
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const { settings, ready, reload, error } = useSettings();
  const reduced = useReducedMotion() || settings.appearance.reducedMotion;
  const [active, setActive] = React.useState<ActiveSession | null>(null);
  const main = React.useRef<HTMLElement>(null);
  const study = pathname.startsWith("/session") || pathname.startsWith("/revision");
  React.useEffect(watchRecordReplacement, []);
  React.useEffect(() => {
    const refresh = () => {
      if (ready)
        void fetchActiveSession()
          .then(setActive)
          .catch(() => setActive(null));
    };
    refresh();
    window.addEventListener("phos-record-change", refresh);
    // Next restores scrolling; announce the destination without another scroll jump.
    main.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("phos-record-change", refresh);
  }, [pathname, ready]);
  if (error && !ready)
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl">Your record couldn’t open</h1>
        <p role="alert" className="text-muted-foreground my-5">
          {error}
        </p>
        <Button onClick={() => void reload().catch(() => undefined)}>Try again</Button>
      </div>
    );
  if (!ready)
    return (
      <div role="status" className="mx-auto max-w-md px-6 py-20">
        <span className="eyebrow">PHOS</span>
        <p className="text-muted-foreground mt-5">Opening your Hifz record…</p>
      </div>
    );
  if (!settings.onboarding.completed)
    return (
      <OnboardingWizard
        onComplete={() => {
          window.scrollTo(0, 0);
          void reload().catch(() => undefined);
        }}
      />
    );
  const selected = pathname.startsWith("/history")
    ? "/analytics"
    : ["/settings", "/backup", "/about"].some((path) => pathname.startsWith(path))
      ? "/more"
      : pathname;
  const nav = (desktop: boolean) => (
    <nav
      aria-label={desktop ? "Main navigation" : "Mobile navigation"}
      className={desktop ? "flex flex-col gap-1" : "grid grid-cols-4"}
    >
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={selected.startsWith(href) ? "page" : undefined}
          className={cn(
            "group flex min-h-[52px] items-center gap-3 rounded-lg text-sm font-medium transition-colors",
            desktop ? "px-4" : "flex-col gap-1 py-2",
            selected.startsWith(href)
              ? "bg-accent text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>
        <div className="min-h-dvh">
          <a
            href="#main-content"
            className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:p-3"
          >
            Skip to content
          </a>
          <aside className="bg-background fixed inset-y-0 left-0 hidden w-52 flex-col border-r px-4 pt-10 pb-6 lg:flex">
            <Link href="/dashboard" className="mb-10 px-4">
              <span className="folio-title text-3xl tracking-[.06em]">PHOS</span>
              <span className="text-muted-foreground mt-1 block text-xs">
                Personal Hifz Operating System
              </span>
            </Link>
            {nav(true)}
            <div className="mt-auto border-t px-4 pt-5">
              <p className="text-muted-foreground text-sm">
                Keep what you know.
                <br />
                Make room for what’s next.
              </p>
              <Link
                className="text-muted-foreground mt-4 inline-flex min-h-11 items-center text-sm"
                href="/about"
              >
                About PHOS
              </Link>
            </div>
          </aside>
          <div className="lg:ml-52">
            <header className="chrome sticky top-0 z-20 flex min-h-16 items-center justify-between border-b px-5 pt-[env(safe-area-inset-top)] lg:px-10">
              {study ? (
                <Link href="/dashboard" className="flex min-h-11 items-center gap-2 text-sm">
                  <ArrowLeft size={18} />
                  Today
                </Link>
              ) : (
                <Link href="/dashboard" className="folio-title text-xl tracking-[.06em] lg:text-lg">
                  PHOS
                </Link>
              )}
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground hidden text-xs sm:block">
                  Your daily Hifz companion
                </span>
                <ThemeToggle />
              </div>
            </header>
            {active && !study && (
              <Link
                href={active.sessionType === SessionType.Sabaq ? "/session" : "/revision"}
                className="bg-accent flex min-h-12 items-center justify-between gap-3 border-b px-5 text-sm lg:px-10"
              >
                <span>
                  {active.sessionType === SessionType.Sabaq
                    ? "Sabaq"
                    : active.sessionType === SessionType.Sabqi
                      ? "Sabaqi"
                      : active.sessionType}{" "}
                  is waiting for you · Resume study
                </span>
                <ArrowRight size={18} />
              </Link>
            )}
            <main
              id="main-content"
              tabIndex={-1}
              ref={main}
              className={cn("app-main outline-none", study && "max-w-[840px] pb-40", className)}
            >
              <m.div
                key={pathname}
                initial={{ opacity: 0, y: reduced ? 0 : 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </m.div>
            </main>
          </div>
          {!study && (
            <div className="chrome safe-area-bottom fixed inset-x-0 bottom-0 z-30 border-t px-2 lg:hidden">
              {nav(false)}
            </div>
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
