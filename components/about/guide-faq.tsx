"use client";

import React from "react";
import { ContentCard } from "@/components/shared/content-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "./guide-content";

/**
 * The guide's FAQ, as an explorable accordion.
 *
 * Collapsed by default so the page stays scannable — someone looking
 * for one answer should not have to read eight. Uses the existing
 * `components/ui/accordion`, which was unused until this became its
 * first consumer.
 */
export function GuideFaq() {
  return (
    <ContentCard as="section" id="faq">
      <h2 className="mb-1 text-lg font-semibold">Common questions</h2>
      <p className="mb-2 text-sm text-muted-foreground">Select a question to see its answer.</p>

      <Accordion type="single" collapsible>
        {FAQ.map((entry) => (
          <AccordionItem key={entry.id} value={entry.id}>
            <AccordionTrigger className="text-sm">{entry.question}</AccordionTrigger>
            <AccordionContent>
              <p className="leading-relaxed text-muted-foreground">{entry.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ContentCard>
  );
}
