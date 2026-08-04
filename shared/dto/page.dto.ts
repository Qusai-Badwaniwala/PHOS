/**
 * "Only information required by the client shall be included. Internal
 * memory variables may be omitted where unnecessary" (SDS Part 16) —
 * memoryStrength/memoryStability/difficulty are deliberately excluded.
 */
export interface PageDTO {
  readonly pageId: string;
  readonly pageNumber: number;
  readonly juzNumber: number;
  readonly memoryState: string;
  readonly lastReviewedAt: string | null;
}
