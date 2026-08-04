/**
 * PHOS Frontend Types
 * Presentation-layer type definitions.
 * Backend DTOs extend and replace these during Sprint 10.
 */

export * from "./dto";

export type Theme = "light" | "dark" | "system";

export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
};

export type PageStatus = "idle" | "loading" | "error" | "empty" | "success";
