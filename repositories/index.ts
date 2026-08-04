/**
 * Repository Layer — public barrel export.
 *
 * Engines depend on the interfaces exported here, never on a concrete
 * class, and never instantiate a repository themselves (SDS Part 9
 * "DEPENDENCY INJECTION"). That rule is the only reason PHOS could move
 * from SQLite to IndexedDB without touching an engine: the concrete
 * classes were swapped in `client/container.ts` and nothing above the
 * interfaces noticed.
 *
 * The implementations themselves live in `./browser` and are imported
 * from there, not re-exported here — a caller reaching for a concrete
 * repository should have to say which backing store it wants.
 */

export * from "./interfaces";
export * from "./errors";
