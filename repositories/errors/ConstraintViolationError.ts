import { RepositoryException } from "@/shared/errors";

/**
 * Thrown when a repository operation would violate a database
 * constraint other than uniqueness — most notably a foreign-key
 * restriction (e.g. attempting to delete a Page that still has
 * RecallEvents, which the schema's `onDelete: Restrict` forbids per
 * SDS Part 8's "historical records are permanent" rule). Translated
 * from Prisma's `P2003` error code.
 */
export class ConstraintViolationError extends RepositoryException {
  constructor(
    description: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("REPOSITORY_CONSTRAINT_001", description, correlationId, optionalDetails);
  }
}
