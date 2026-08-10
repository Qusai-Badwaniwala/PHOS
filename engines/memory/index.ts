/**
 * Public barrel export for the Memory Engine (SDS Part 10, MODULE 05).
 * Only the engine's public entry point, its dependency type, its
 * public interface, and its domain errors are exported here. Internal
 * calculators and validators remain private to this folder.
 */
export { MemoryEngine, PRIOR_MEMORIZATION_DIFFICULTY } from "./MemoryEngine";
export type { MemoryEngineDependencies } from "./MemoryEngine";
export * from "./interfaces";
export * from "./errors";
