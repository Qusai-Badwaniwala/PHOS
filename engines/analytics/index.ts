/**
 * Public barrel export for the Analytics Engine (SDS Part 14,
 * MODULE 08). Only the engine's public entry point, its dependency
 * type, its public interface, and its domain errors are exported here.
 */
export { AnalyticsEngine } from "./AnalyticsEngine";
export type { AnalyticsEngineDependencies } from "./AnalyticsEngine";
export * from "./interfaces";
export * from "./errors";
