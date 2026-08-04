/**
 * Supported log levels, in ascending order of severity
 * (SDS Part 23 "LOG LEVELS").
 */
export enum LogLevel {
  Trace = "TRACE",
  Debug = "DEBUG",
  Info = "INFO",
  Warn = "WARN",
  Error = "ERROR",
  Fatal = "FATAL",
}

/**
 * Numeric severity ranking used to implement minimum-level filtering.
 * Kept private to this module — callers only ever work with `LogLevel`.
 */
export const LOG_LEVEL_SEVERITY: Readonly<Record<LogLevel, number>> = {
  [LogLevel.Trace]: 0,
  [LogLevel.Debug]: 1,
  [LogLevel.Info]: 2,
  [LogLevel.Warn]: 3,
  [LogLevel.Error]: 4,
  [LogLevel.Fatal]: 5,
};

/**
 * One structured log entry (SDS Part 23 "STRUCTURED LOG FORMAT":
 * "Every log entry shall contain: timestamp, level, correlationId,
 * component, operation, message, duration (where applicable),
 * optionalMetadata.").
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly correlationId: string;
  readonly component: string;
  readonly operation: string;
  readonly message: string;
  readonly durationMs?: number;
  readonly optionalMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * Parameters accepted by every logging method
 * (`trace`/`debug`/`info`/`warn`/`error`/`fatal`). Using a single
 * params object keeps call sites self-explanatory (SDS Part 4
 * "Code should read like technical documentation") instead of relying
 * on positional arguments.
 */
export interface LogParams {
  readonly correlationId: string;
  readonly component: string;
  readonly operation: string;
  readonly message: string;
  readonly durationMs?: number;
  readonly optionalMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * A log sink writes a completed `LogEntry` somewhere (console, file,
 * external service). Injected into the Logger rather than hardcoded,
 * per SDS Part 4 "DEPENDENCY INJECTION".
 */
export type LogSink = (entry: LogEntry) => void;
