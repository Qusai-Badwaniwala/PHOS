/**
 * Public barrel export for the Learning Engine (SDS Part 12,
 * MODULE 06). Only the engine's public entry point, its dependency
 * type, its public interface, and its domain errors are exported here.
 */
export { LearningEngine } from "./LearningEngine";
export type { LearningEngineDependencies } from "./LearningEngine";
export * from "./interfaces";
export * from "./errors";
export {
  SESSION_TYPE_WORKLOAD_CATEGORIES,
  SESSION_REHYDRATION_STUDY_MINUTES,
  isCategoryInSessionScope,
} from "./constants";
