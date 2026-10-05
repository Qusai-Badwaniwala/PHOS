"use client";

import React from "react";

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
    <section className="folio-section" id="faq">
      <h2 className="mb-1 font-serif text-2xl">Common questions</h2>
      <p className="text-muted-foreground mb-2 text-sm">Select a question to see its answer.</p>

      <Accordion type="single" collapsible>
        {FAQ.map((entry) => (
          <AccordionItem key={entry.id} value={entry.id}>
            <AccordionTrigger className="text-sm">{entry.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground leading-relaxed">{entry.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
