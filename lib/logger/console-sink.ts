import { LogLevel } from "./types";
import type { LogEntry, LogSink } from "./types";

/**
 * Default log sink: writes each entry to the console as a single-line
 * structured JSON object (SDS Part 23 "Rule 1: Logs shall be
 * structured." / "Rule 2: Logs shall remain machine-readable.").
 *
 * PHOS is a local-first, single-user, standalone Node.js process
 * (see project README); a console sink is a deliberately simple and
 * sufficient log destination for that deployment shape (SDS Part 4:
 * "Do not optimize prematurely. Only optimize demonstrated
 * bottlenecks."). Routing to `console.error`/`console.warn` for
 * higher-severity entries keeps this compatible with the project's
 * ESLint `no-console` rule, which only allows those two methods.
 */
export const consoleSink: LogSink = (entry: LogEntry): void => {
  const serializedEntry = JSON.stringify(entry);

  switch (entry.level) {
    case LogLevel.Error:
    case LogLevel.Fatal:
      console.error(serializedEntry);
      return;
    case LogLevel.Warn:
      console.warn(serializedEntry);
      return;
    case LogLevel.Trace:
    case LogLevel.Debug:
    case LogLevel.Info:
      // eslint-disable-next-line no-console -- structured logging is this module's one approved use of console output.
      console.log(serializedEntry);
      return;
  }
};
