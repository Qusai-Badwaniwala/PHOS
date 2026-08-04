/**
 * Public barrel export for the Adaptive Engine (SDS Part 11,
 * MODULE 07). Only the engine's public entry point, its dependency
 * type, its public interface, its configuration contract, and its
 * domain errors are exported here.
 */
export { AdaptiveEngine } from "./AdaptiveEngine";
export type { AdaptiveEngineDependencies } from "./AdaptiveEngine";
export * from "./interfaces";
export * from "./errors";
export * from "./constants";
