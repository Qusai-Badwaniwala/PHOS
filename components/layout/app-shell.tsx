"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useSettings } from "@/providers/settings-provider";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { settings, ready, reload } = useSettings();

  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // A new user meets the wizard before anything else
  // (PRODUCT_REQUIREMENTS Requirements 1 and 6). Rendered in place of
  // the whole shell rather than as a dismissible overlay: navigation
  // into a dashboard that has nothing to show yet would be a worse
  // first impression than a short setup, and the requirement is that
  // every new user *receives* the introduction.
  //
  // Gated on `ready` so an in-flight settings fetch never flashes the
  // wizard at someone who completed it months ago.
  if (ready && !settings.onboarding.completed) {
    return (
      <div className="min-h-screen bg-background">
        <OnboardingWizard onComplete={() => void reload()} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Skip to content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar — fixed, 256px */}
      <aside
        className="z-30 hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col"
        aria-label="Application navigation"
      >
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-phos-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="animate-fade-in fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-card shadow-xl">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <TopNav onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main
          id="main-content"
          className={cn(
            "flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10",
            "mx-auto w-full max-w-screen-xl",
            className,
          )}
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
