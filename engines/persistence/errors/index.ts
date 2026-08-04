import { DomainException } from "@/shared/errors";

/** Thrown when `createBackup()` cannot produce a snapshot (SDS Part 13). */
export class BackupCreationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_BACKUP_CREATE_001", message, correlationId, optionalDetails);
  }
}

/**
 * Thrown when a backup fails integrity verification. "A backup shall
 * never be marked successful until verification completes" — this
 * error is what enforces that rule.
 */
export class BackupVerificationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_BACKUP_VERIFY_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `restoreBackup()` cannot complete safely. */
export class RestoreFailedError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_RESTORE_001", message, correlationId, optionalDetails);
  }
}

/**
 * Thrown when import validation fails. Per "Invalid imports shall fail
 * before modifying the existing database," raising this must never
 * happen after any write has occurred.
 */
export class ImportValidationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_IMPORT_VALIDATION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `exportData()` cannot produce a complete export file. */
export class ExportFailedError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_EXPORT_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `verifyDatabase()` finds the live database unhealthy. */
export class DatabaseIntegrityError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_DB_INTEGRITY_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when `runMigration()` fails to apply pending migrations. */
export class MigrationError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_MIGRATION_001", message, correlationId, optionalDetails);
  }
}

/** Thrown when the filesystem location required for an operation is unavailable. */
export class StorageUnavailableError extends DomainException {
  constructor(
    message: string,
    correlationId: string,
    optionalDetails?: Readonly<Record<string, unknown>>,
  ) {
    super("PERSISTENCE_STORAGE_UNAVAILABLE_001", message, correlationId, optionalDetails);
  }
}
