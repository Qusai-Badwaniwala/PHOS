import { RepositoryException } from "@/shared/errors";

/**
 * Thrown when a repository operation would violate a uniqueness
 * constraint (e.g. creating a Page with a `pageNumber` that already
 * exists). Translated from Prisma's `P2002` error code.
 */
export class DuplicateEntityError extends RepositoryException {
  constructor(
    entityName: string,
    conflictingField: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "REPOSITORY_DUPLICATE_001",
      `${entityName} already exists with a conflicting value for "${conflictingField}".`,
      correlationId,
      optionalDetails,
    );
  }
}
