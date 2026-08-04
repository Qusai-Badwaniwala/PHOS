import { generateCorrelationId } from "@/shared/utils";
import { LOG_LEVEL_SEVERITY, LogLevel } from "./types";
import type { LogEntry, LogParams, LogSink } from "./types";

export interface LoggerOptions {
  /** Entries below this level are discarded (SDS Part 23 "CONFIGURATION" — "Minimum log level"). */
  readonly minimumLevel: LogLevel;
  /** Where completed entries are written (SDS Part 23 "CONFIGURATION" — "Log destination"). */
  readonly sink: LogSink;
}

/**
 * The PHOS Logging System (SDS Part 23).
 *
 * Provides structured, leveled logging with correlation ID support and
 * performance timing, without ever altering application behavior
 * (Part 23 "Rule 5: Logging shall never modify application behavior").
 *
 * Sensitive information must never be passed into `message` or
 * `optionalMetadata` (Part 23 "Rule 4") — the Logger has no way to
 * detect what is sensitive, so this responsibility belongs to every
 * caller.
 */
export class Logger {
  private readonly minimumLevel: LogLevel;
  private readonly sink: LogSink;
  private readonly activeTimers = new Map<string, number>();

  constructor(options: LoggerOptions) {
    this.minimumLevel = options.minimumLevel;
    this.sink = options.sink;
  }

  trace(params: LogParams): void {
    this.write(LogLevel.Trace, params);
  }

  debug(params: LogParams): void {
    this.write(LogLevel.Debug, params);
  }

  info(params: LogParams): void {
    this.write(LogLevel.Info, params);
  }

  warn(params: LogParams): void {
    this.write(LogLevel.Warn, params);
  }

  error(params: LogParams): void {
    this.write(LogLevel.Error, params);
  }

  fatal(params: LogParams): void {
    this.write(LogLevel.Fatal, params);
  }

  /**
   * Creates a new correlation identifier (SDS Part 23 "CORRELATION ID
   * CONTRACT"). The caller is responsible for propagating the same
   * identifier through API -> Engine -> Repository -> Background Jobs.
   */
  createCorrelationId(): string {
    return generateCorrelationId();
  }

  /**
   * Starts a performance timer and returns an opaque handle
   * (SDS Part 23 "PERFORMANCE OBSERVABILITY"). Pass the handle to
   * `stopTimer()` to obtain the elapsed duration.
   */
  startTimer(): string {
    const timerHandle = generateCorrelationId();
    this.activeTimers.set(timerHandle, Date.now());
    return timerHandle;
  }

  /**
   * Stops a timer previously created by `startTimer()` and returns the
   * elapsed duration in milliseconds. Calling this with an unknown or
   * already-stopped handle indicates a programming error in the
   * caller, not a recoverable application state, so it throws a plain
   * `Error` rather than a PHOS domain exception.
   */
  stopTimer(timerHandle: string): number {
    const startedAtMs = this.activeTimers.get(timerHandle);
    if (startedAtMs === undefined) {
      throw new Error(
        `Logger.stopTimer() called with an unknown or already-stopped timer handle: "${timerHandle}".`,
      );
    }
    this.activeTimers.delete(timerHandle);
    return Date.now() - startedAtMs;
  }

  private write(level: LogLevel, params: LogParams): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: params.correlationId,
      component: params.component,
      operation: params.operation,
      message: params.message,
      ...(params.durationMs !== undefined ? { durationMs: params.durationMs } : {}),
      ...(params.optionalMetadata !== undefined
        ? { optionalMetadata: params.optionalMetadata }
        : {}),
    };

    this.sink(entry);
  }

  private isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.minimumLevel];
  }
}
