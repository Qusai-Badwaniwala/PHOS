import type { ErrorCategory } from "./enums";

/**
 * The shape every internal PHOS error/exception must carry
 * (SDS Part 19 "STANDARD ERROR MODEL"). This describes the *data*
 * every error carries; the runtime Exception class hierarchy
 * (BaseException -> ValidationException -> DomainException ->
 * RepositoryException -> InfrastructureException ->
 * UnexpectedApplicationException) that implements this shape belongs
 * to Shared Utilities (MODULE 03), not to this types-only module.
 */
export interface StandardErrorModel {
  readonly errorCode: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly optionalDetails?: Readonly<Record<string, unknown>>;
}
