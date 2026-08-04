import type { Page } from "@/shared/types";
import { IncompleteMemoryProfileError, InvalidStudyDurationError } from "../errors";

const MAX_REASONABLE_STUDY_MINUTES = 24 * 60;

export function validateStudyDuration(availableStudyMinutes: number, correlationId: string): void {
  if (
    typeof availableStudyMinutes !== "number" ||
    !Number.isFinite(availableStudyMinutes) ||
    availableStudyMinutes <= 0 ||
    availableStudyMinutes > MAX_REASONABLE_STUDY_MINUTES
  ) {
    throw new InvalidStudyDurationError(availableStudyMinutes, correlationId);
  }
}

export function validateMemoryProfile(page: Page, correlationId: string): void {
  const isValidNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  if (
    !isValidNumber(page.memoryStrength) ||
    !isValidNumber(page.memoryStability) ||
    !isValidNumber(page.difficulty) ||
    !page.memoryState
  ) {
    throw new IncompleteMemoryProfileError(page.id, correlationId);
  }
}
