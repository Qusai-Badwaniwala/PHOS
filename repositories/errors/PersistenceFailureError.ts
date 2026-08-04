import { RepositoryException } from "@/shared/errors";

/**
 * Fallback error for a persistence failure that does not match any of
 * the more specific repository error types. Used so that raw Prisma
 * or SQLite errors never propagate outside the Repository Layer
 * (SDS Part 9 "ERROR CONTRACT").
 */
export class PersistenceFailureError extends RepositoryException {
  constructor(
    description: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("REPOSITORY_FAILURE_001", description, correlationId, optionalDetails);
  }
}
