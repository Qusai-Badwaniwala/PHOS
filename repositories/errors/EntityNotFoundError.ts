import { RepositoryException } from "@/shared/errors";

/**
 * Thrown when a repository operation requires an entity to already
 * exist (e.g. `updateMemoryState(pageId, state)` for a `pageId` that
 * does not exist) and it does not.
 *
 * This is distinct from a normal "not found" lookup: per SDS Part 9
 * "RETURN CONTRACTS", simple lookups such as `findById()` return
 * `null` when nothing matches — they never throw. This error is
 * reserved for operations where a missing entity represents a genuine
 * failure, not an expected empty result.
 *
 * Named `EntityNotFoundError` per SDS Part 19's Error Handling
 * Specification (Part 9's Repository Contracts mentions the same
 * concept as `RepositoryNotFoundError`; Part 19 is followed here as
 * the more specifically-scoped naming authority for error classes).
 */
export class EntityNotFoundError extends RepositoryException {
  constructor(
    entityName: string,
    identifier: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super(
      "REPOSITORY_NOT_FOUND_001",
      `${entityName} with identifier "${identifier}" was not found.`,
      correlationId,
      optionalDetails,
    );
  }
}
