/**
 * Logging System — public barrel export (SDS Part 3, MODULE 03;
 * SDS Part 23 "LOGGING & OBSERVABILITY SPECIFICATION").
 *
 * Exports a single shared `Logger` instance. Every other layer imports
 * `logger` from here rather than constructing its own.
 *
 * The level used to come from `PHOS_LOG_LEVEL` via `lib/config/env`.
 * That file was deleted with the server: there is no `process.env` in a
 * browser, and a static build has no startup at which to read one. The
 * level is instead fixed at `Warn` in production and `Debug` in
 * development — a decision the build already makes, rather than a knob
 * that would have to be turned before a rebuild to have any effect.
 */

import { consoleSink } from "./console-sink";
import { Logger } from "./Logger";
import { LogLevel } from "./types";

export const logger = new Logger({
  minimumLevel: process.env.NODE_ENV === "production" ? LogLevel.Warn : LogLevel.Debug,
  sink: consoleSink,
});

export { Logger } from "./Logger";
export type { LoggerOptions } from "./Logger";
export { LogLevel, LOG_LEVEL_SEVERITY } from "./types";
export type { LogEntry, LogParams, LogSink } from "./types";
