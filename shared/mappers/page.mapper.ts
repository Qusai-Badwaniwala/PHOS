import type { Page } from "@/shared/types";
import type { PageDTO } from "@/shared/dto";

export function toPageDTO(page: Page): PageDTO {
  return {
    pageId: page.id,
    pageNumber: page.pageNumber,
    juzNumber: page.juzNumber,
    memoryState: page.memoryState,
    lastReviewedAt: page.lastReviewedAt ? page.lastReviewedAt.toISOString() : null,
  };
}
