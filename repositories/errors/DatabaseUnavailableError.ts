import { RepositoryException } from "@/shared/errors";

/**
 * Thrown when the database file cannot be reached or opened
 * (e.g. Prisma's `P1003` "database file does not exist" or a
 * filesystem-level failure opening the SQLite file). Distinct from
 * `PersistenceFailureError`, which covers failures during an
 * otherwise-reachable database's query execution.
 */
export class DatabaseUnavailableError extends RepositoryException {
  constructor(correlationId: string, optionalDetails?: Readonly<Record<string, unknown>>) {
    super(
      "REPOSITORY_UNAVAILABLE_001",
      "The database could not be reached.",
      correlationId,
      optionalDetails,
    );
  }
}
