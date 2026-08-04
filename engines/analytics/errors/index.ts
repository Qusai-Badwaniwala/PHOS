import { DomainException } from "@/shared/errors";

/** Fallback error for an unexpected failure during any analytics calculation. */
export class AnalyticsCalculationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ANALYTICS_CALCULATION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when a calculation requires historical data that does not exist yet (e.g. trend analysis with no recall history at all). */
export class MissingHistoricalDataError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ANALYTICS_MISSING_DATA_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when an invalid ReportingPeriod is supplied. */
export class InvalidReportingPeriodError extends DomainException {
  constructor(
    receivedValue: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "ANALYTICS_INVALID_PERIOD_001",
      `Invalid reporting period: "${receivedValue}".`,
      correlationId,
      optionalDetails,
    );
  }
}

/** Thrown when `generateDashboard()` cannot assemble a complete dashboard. */
export class DashboardGenerationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ANALYTICS_DASHBOARD_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when a specific statistics-generation method (session, historical, progress, trend) fails. */
export class StatisticsGenerationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("ANALYTICS_STATISTICS_001", message, correlationId, optionalDetails);
  }
}
