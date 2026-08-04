import { ErrorCategory } from "@/shared/types";
import { BaseException } from "./BaseException";

/**
 * Base class for Infrastructure Errors (SDS Part 19 "INFRASTRUCTURE
 * ERRORS": missing configuration, filesystem failure, backup
 * corruption, database unavailable, startup failure — "isolated from
 * business logic").
 *
 * Never thrown directly. Concrete subclasses are defined by the
 * modules responsible for each concern (configuration loading,
 * database initialization, backup/restore, application startup).
 */
export abstract class InfrastructureException extends BaseException {
  readonly category = ErrorCategory.Infrastructure;
}
