/**
 * The DTOs that cross the boundary out of PHOS's engines.
 *
 * These lived under `app/api/v1/_shared/dto` while PHOS served them
 * over HTTP. They moved here when PHOS became a static PWA and the
 * engines began running in the browser: the contract they describe —
 * what an engine result looks like once it is safe for a client to
 * hold — did not change, but "the API layer" is no longer a place.
 *
 * They remain distinct from `types/dto.ts`, the frontend's presentation
 * DTOs. `lib/api/*` is still the adapter between the two, and React
 * components still consume only the latter.
 */
export * from "./session.dto";
export * from "./page.dto";
export * from "./analytics.dto";
export * from "./settings.dto";
export * from "./backup.dto";
export * from "./exam.dto";
export * from "./validators";
