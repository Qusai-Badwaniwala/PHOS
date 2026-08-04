/**
 * First-time guidance copy (PRODUCT_REQUIREMENTS Requirement 6,
 * "First-Time Guidance & Expectations").
 *
 * Drawn from §9 of `docs/product-guide-source.md` ("What PHOS is — and
 * isn't"), written by Qusai, which is almost exactly the screen this
 * requirement asks for. Kept in one module because Requirement 6 also
 * states the same information must remain available later from About —
 * two copies of this wording would eventually disagree, and the one on
 * the About page would be the one nobody noticed had drifted.
 */

export const WELCOME_TITLE = "Welcome to PHOS";

export const WELCOME_SUBTITLE =
  "Your Personal Hifz Operating System — a calm, structured companion for memorizing the Quran.";

/** What PHOS does. Requirement 6, "THE INTRODUCTION SHOULD EXPLAIN". */
export const PHOS_DOES: readonly string[] = [
  "Organizes your memorization so you always know what to work on today",
  "Plans revision alongside new memorization, as an equal half of the journey",
  "Adapts to your actual progress rather than a fixed schedule",
  "Removes the daily planning decisions so your attention stays on the Quran",
  "Helps you stay consistent over months and years",
];

/** What PHOS does not do. Requirement 6, "PHOS DOES NOT". */
export const PHOS_DOES_NOT: readonly string[] = [
  "Replace your Mushaf",
  "Replace your teacher",
  "Listen to your recitation",
  "Correct your Tajweed",
  "Guarantee memorization",
  "Force you into one memorization method",
];

/** Requirement 6, "IMPORTANT MESSAGE". */
export const IMPORTANT_MESSAGE =
  "PHOS is an assistant. Your consistency, sincerity, teacher and effort remain the most important factors in successful Hifz.";

/** From §9 of the product guide. */
export const CLOSING_NOTE = "Technology can support your journey. Only you can walk it.";
