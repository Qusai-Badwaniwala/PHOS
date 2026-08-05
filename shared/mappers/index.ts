/**
 * Domain model → DTO mappers.
 *
 * Moved here from `app/api/v1/_shared/mappers` when PHOS became a
 * static PWA; see `shared/dto/index.ts` for why. The mapping itself is
 * unchanged, which is the point — the same function that shaped an HTTP
 * response now shapes an in-process result, so nothing the UI receives
 * differs from what it received before.
 */
export * from "./session.mapper";
export * from "./page.mapper";
export * from "./analytics.mapper";
export * from "./settings.mapper";
export * from "./backup.mapper";
export * from "./exam.mapper";
