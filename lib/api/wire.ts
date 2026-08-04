/**
 * The engine-side shapes the adapter layer consumes.
 *
 * Why this file exists
 * --------------------
 * PHOS deliberately keeps two DTO vocabularies: what the engines
 * produce (`shared/dto/*`) and what the screens consume
 * (`types/dto.ts`). `lib/api/*` is the adapter between them, and it is
 * the one layer that legitimately has to know both sides.
 *
 * Each adapter used to re-declare its own local copy of the engine's
 * shape. Those copies were never checked against the real thing, so
 * when `workloadCategory` was missing from the actual response, three
 * separate adapters still declared it as a required `string` and
 * filtered on it — every scheduled page silently fell into Revision and
 * Session was permanently empty, with zero compiler complaint.
 *
 * Re-exporting the real types here makes that class of bug a build
 * error instead of a silent runtime fault. Only `lib/api/*` may import
 * from this module — React components continue to consume `@/types/dto`
 * exclusively, so the presentation boundary is unchanged.
 */

export type {
  DailyStudyPlanDTO as BackendDailyPlan,
  StudyItemDTO as BackendStudyItem,
} from "@/shared/dto/session.dto";
