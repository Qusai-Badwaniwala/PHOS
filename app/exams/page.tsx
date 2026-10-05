"use client";

import React from "react";
import { PageContent } from "@/components/shared/page-content";
import { PageHeader } from "@/components/shared/page-header";
import { ExamSection } from "@/components/exams/exam-section";

/**
 * Exams, on their own screen.
 *
 * They began as a card on the Dashboard and outgrew it. Preparing for
 * an exam is a distinct mode with its own roadmap, its own schedule and
 * its own decisions, and none of that is "what should I do today" —
 * which is the Dashboard's only job. What stays on the Dashboard is a
 * single strip while an exam is running, because exam mode changes
 * today's plan and the reason for that has to be visible where the
 * change is.
 */
export default function ExamsPage() {
  return (
    <PageContent>
      <PageHeader
        title="Prepare with intention"
        description="Your next exam, its complete coverage, and the record of what you have passed."
      />
      <ExamSection />
    </PageContent>
  );
}
