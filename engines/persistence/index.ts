/**
 * Public barrel export for the Persistence Engine (SDS Part 13,
 * MODULE 04). Only the engine's public contract, its domain errors, and
 * its file-format models are exported here.
 *
 * The engine implementation lives in `./browser`, imported from there
 * rather than re-exported, so a caller has to name the storage it means.
 * The SQLite implementation that stood alongside it was deleted in
 * Phase 9 when PHOS moved into the browser — keeping an unreachable
 * second copy of backup and restore would have meant two definitions of
 * "the data is safe", only one of which ever ran.
 */
export * from "./interfaces";
export * from "./errors";
export * from "./models";
export * from "./constants";
